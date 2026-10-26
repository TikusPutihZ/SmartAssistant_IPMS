using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using IpmsSmartAssistant.Api.Data;
using IpmsSmartAssistant.Api.Models;
using UglyToad.PdfPig;
using System.IO;
using System.IO.Compression;
using System.Xml.Linq;

namespace IpmsSmartAssistant.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class KnowledgeBaseController : ControllerBase
    {
        private readonly AppDbContext _context;

        public KnowledgeBaseController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/knowledgebase
        // Retrieves all current manuals for the dashboard to display
        [HttpGet]
        public async Task<IActionResult> GetKnowledgeBase()
        {
            var entries = await _context.KnowledgeBaseEntries.ToListAsync();
            var manualsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "manuals");

            var response = entries.Select(e =>
            {
                string ext = "";
                if (Directory.Exists(manualsFolder))
                {
                    var matchedFile = Directory.GetFiles(manualsFolder, $"{e.Title}.*").FirstOrDefault();
                    if (matchedFile != null)
                    {
                        ext = Path.GetExtension(matchedFile).ToLowerInvariant();
                    }
                }

                return new
                {
                    e.Id,
                    e.Title,
                    e.Keywords,
                    e.Content,
                    e.LastModifiedBy,
                    e.LastModifiedAt,
                    e.CreatedAt,
                    FileExtension = ext
                };
            });

            return Ok(response);
        }

        // POST: api/knowledgebase
        // Allows the admin to type in new manuals/resolutions
        [HttpPost]
        public async Task<IActionResult> AddEntry([FromBody] KnowledgeBaseEntry newEntry)
        {
            if (string.IsNullOrWhiteSpace(newEntry.Content))
            {
                return BadRequest(new { message = "Manual content cannot be empty." });
            }

            // EXACT MATCH: Set both to the exact same time for new entries
            var currentTime = DateTime.Now;
            newEntry.CreatedAt = currentTime;
            newEntry.LastModifiedAt = currentTime;
            newEntry.LastModifiedBy = string.IsNullOrWhiteSpace(newEntry.LastModifiedBy) ? "Admin" : newEntry.LastModifiedBy;

            _context.KnowledgeBaseEntries.Add(newEntry);
            await _context.SaveChangesAsync();

            return Ok(new { message = "New knowledge base entry added successfully!", entry = newEntry });
        }

        // DELETE: api/knowledgebase/{id}
        // Allows the admin to delete outdated manuals
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteEntry(int id)
        {
            var entry = await _context.KnowledgeBaseEntries.FindAsync(id);
            if (entry == null)
            {
                return NotFound(new { message = "Entry not found." });
            }

            _context.KnowledgeBaseEntries.Remove(entry);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Entry deleted successfully." });
        }

        // POST: api/knowledgebase/upload
        // Parses an uploaded PDF and feeds the text to the RAG database
        [HttpPost("upload")]
        public async Task<IActionResult> UploadManual([FromForm] IFormFile file, [FromForm] string? keywords)
        {
            if (file == null || file.Length == 0)
                return BadRequest("No file was uploaded.");

            string extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            string[] allowedExtensions = { ".pdf", ".docx", ".txt", ".md" };

            if (!allowedExtensions.Contains(extension))
            {
                return BadRequest($"Unsupported file type: {extension}. Supported formats: PDF, DOCX, TXT, MD.");
            }

            try
            {
                // 1. Extract text content from the file based on its extension
                string extractedContent = await ExtractTextFromFileAsync(file, extension);

                if (string.IsNullOrWhiteSpace(extractedContent))
                {
                    return BadRequest("Failed to extract any text from the uploaded document.");
                }

                // 2. Save original file to wwwroot/manuals/ for in-browser download/viewing
                var manualsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "manuals");
                if (!Directory.Exists(manualsFolder))
                {
                    Directory.CreateDirectory(manualsFolder);
                }

                var cleanFileName = Path.GetFileNameWithoutExtension(file.FileName);
                var destinationPath = Path.Combine(manualsFolder, $"{cleanFileName}{extension}");

                using (var stream = new FileStream(destinationPath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }

                // 3. Save to database
                var currentTime = DateTime.UtcNow;
                var newEntry = new KnowledgeBaseEntry
                {
                    Title = cleanFileName,
                    Content = extractedContent,
                    Keywords = keywords ?? string.Empty,
                    LastModifiedBy = "Admin",
                    CreatedAt = currentTime,     // Ensure this is added
                    LastModifiedAt = currentTime
                };

                _context.KnowledgeBaseEntries.Add(newEntry);
                await _context.SaveChangesAsync();

                return Ok(newEntry);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error processing document: {ex.Message}");
            }
        }

        // Helper: Multi-format Text Extractor
        private async Task<string> ExtractTextFromFileAsync(IFormFile file, string extension)
        {
            switch (extension)
            {
                case ".txt":
                case ".md":
                    using (var reader = new StreamReader(file.OpenReadStream()))
                    {
                        return await reader.ReadToEndAsync();
                    }

                case ".docx":
                    // Word (.docx) documents are zip packages containing word/document.xml
                    using (var stream = file.OpenReadStream())
                    using (var archive = new ZipArchive(stream))
                    {
                        var entry = archive.GetEntry("word/document.xml");
                        if (entry == null) return string.Empty;

                        using (var entryStream = entry.Open())
                        {
                            var xdoc = await XDocument.LoadAsync(entryStream, LoadOptions.None, CancellationToken.None);
                            // Combine all text (<w:t>) tags inside paragraphs
                            var textNodes = xdoc.Descendants()
                                .Where(node => node.Name.LocalName == "t")
                                .Select(node => node.Value);

                            return string.Join(" ", textNodes);
                        }
                    }

                case ".pdf":
                    // Retain your existing PDF extraction logic here:
                    using (var pdfStream = file.OpenReadStream())
                    {
                        // If you are using PdfPig:
                        using var pdfDoc = UglyToad.PdfPig.PdfDocument.Open(pdfStream);
                        var pagesText = pdfDoc.GetPages().Select(p => p.Text);
                        return string.Join("\n", pagesText);
                    }

                default:
                    return string.Empty;
            }
        }

        [HttpGet("pdf/{fileName}")]
        public IActionResult GetPdf(string fileName)
        {
            // FIX: Point to the exact "wwwroot/manuals" folder where the PDF was actually saved
            var filePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "manuals", fileName);

            // If the file isn't on the hard drive, return a 404
            if (!System.IO.File.Exists(filePath))
            {
                return NotFound($"The PDF '{fileName}' could not be found on the server.");
            }

            // Open the file and send it back to React as a viewable PDF
            var fileStream = new FileStream(filePath, FileMode.Open, FileAccess.Read);
            return File(fileStream, "application/pdf");
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateManual(int id, [FromBody] UpdateManualRequest request)
        {
            var entry = await _context.KnowledgeBaseEntries.FindAsync(id);
            if (entry == null) return NotFound();

            // Rescue older records: lock in the original date before editing
            if (entry.CreatedAt == null)
            {
                entry.CreatedAt = entry.LastModifiedAt;
            }

            entry.Title = request.Title;
            entry.Keywords = request.Keywords;
            entry.Content = request.Content;
            entry.LastModifiedBy = request.ModifiedBy ?? "Admin";

            // Set the new edit timestamp
            entry.LastModifiedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(entry);
        }

        // GET: api/knowledgebase/file/{id}?download=true
        [HttpGet("file/{id}")]
        public async Task<IActionResult> GetDocumentFile(int id, [FromQuery] bool download = false)
        {
            var entry = await _context.KnowledgeBaseEntries.FindAsync(id);
            if (entry == null) return NotFound("Manual not found in database.");

            var manualsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "manuals");
            if (!Directory.Exists(manualsFolder)) return NotFound("Manuals directory does not exist.");

            var matchedFilePath = Directory.GetFiles(manualsFolder, $"{entry.Title}.*").FirstOrDefault();
            if (matchedFilePath == null) return NotFound("Original file not found on disk.");

            var extension = Path.GetExtension(matchedFilePath).ToLowerInvariant();
            string contentType = extension switch
            {
                ".pdf" => "application/pdf",
                ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                ".txt" => "text/plain; charset=utf-8",
                ".md" => "text/markdown; charset=utf-8",
                _ => "application/octet-stream"
            };

            // If download=true is requested, send as an attachment so browser prompts a download
            if (download)
            {
                return PhysicalFile(matchedFilePath, contentType, Path.GetFileName(matchedFilePath));
            }

            Response.Headers["Content-Disposition"] = "inline";
            return PhysicalFile(matchedFilePath, contentType);
        }

        // GET: api/knowledgebase/view/{title}
        [HttpGet("view/{title}")]
        public async Task<IActionResult> ViewManualByTitle(string title)
        {
            // Find the manual by title or ID
            var entry = await _context.KnowledgeBaseEntries
                .FirstOrDefaultAsync(e => e.Title.ToLower() == title.ToLower() || e.Id.ToString() == title);

            if (entry == null)
            {
                return NotFound($"Manual '{title}' not found in database.");
            }

            var manualsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "manuals");
            string? matchedFile = null;

            if (Directory.Exists(manualsFolder))
            {
                matchedFile = Directory.GetFiles(manualsFolder, $"{entry.Title}.*").FirstOrDefault();
            }

            var extension = matchedFile != null ? Path.GetExtension(matchedFile).ToLowerInvariant() : "";

            // 1. If it's an actual PDF, display in Chrome's native PDF viewer
            if (extension == ".pdf")
            {
                Response.Headers["Content-Disposition"] = "inline";
                return PhysicalFile(matchedFile!, "application/pdf");
            }

            // 2. For Word documents (.docx) or typed notes, serve a formatted standalone reader page
            var encodedContent = System.Net.WebUtility.HtmlEncode(entry.Content);
            var lastModified = entry.LastModifiedAt.HasValue
                ? $"Last updated by {entry.LastModifiedBy ?? "Admin"} on {entry.LastModifiedAt.Value:MMM dd, yyyy • hh:mm tt}"
                : "Official Reference Document";

            var html = $@"<!DOCTYPE html>
            <html lang='en'>
            <head>
                <meta charset='utf-8'/>
                <meta name='viewport' content='width=device-width, initial-scale=1.0'>
                <title>{entry.Title} - IPMS Technical Reference</title>
                <style>
                    body {{
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                        background-color: #0b0f19;
                        color: #e2e8f0;
                        margin: 0;
                        padding: 40px 16px;
                        display: flex;
                        justify-content: center;
                    }}
                    .manual-card {{
                        width: 100%;
                        max-width: 820px;
                        background-color: #131b2e;
                        border: 1px solid #1e293b;
                        border-radius: 16px;
                        padding: 36px 40px;
                        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
                    }}
                    .header {{
                        border-bottom: 1px solid #23314d;
                        padding-bottom: 18px;
                        margin-bottom: 24px;
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                    }}
                    .badge {{
                        display: inline-block;
                        font-size: 11px;
                        font-weight: 600;
                        text-transform: uppercase;
                        letter-spacing: 0.05em;
                        padding: 4px 10px;
                        border-radius: 6px;
                        background-color: rgba(59, 130, 246, 0.15);
                        color: #60a5fa;
                        border: 1px solid rgba(59, 130, 246, 0.3);
                        margin-bottom: 8px;
                    }}
                    h1 {{
                        font-size: 22px;
                        font-weight: 700;
                        color: #ffffff;
                        margin: 0;
                    }}
                    .meta {{
                        font-size: 12px;
                        color: #64748b;
                        margin-top: 6px;
                    }}
                    .content-body {{
                        white-space: pre-wrap;
                        font-size: 14px;
                        line-height: 1.7;
                        color: #cbd5e1;
                        background-color: #0b0f19;
                        border: 1px solid #1e293b;
                        border-radius: 12px;
                        padding: 24px;
                        font-family: 'Consolas', 'Courier New', monospace;
                    }}
                    .actions {{
                        margin-top: 24px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        font-size: 12px;
                        color: #64748b;
                    }}
                    .btn-download {{
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    background-color: #2563eb;
                    color: #ffffff;
                    text-decoration: none;
                    padding: 8px 16px;
                    border-radius: 8px;
                    font-size: 13px;
                    font-weight: 600;
                    transition: background-color 0.15s ease;
                }}
                .btn-download:hover {{
                    background-color: #1d4ed8;
                }}
                </style>
            </head>
            <body>
                <div class='manual-card'>
                    <div class='header'>
                        <div>
                            <span class='badge'>IPMS Verified Knowledge Base</span>
                            <h1>{entry.Title}</h1>
                            <div class='meta'>{lastModified}</div>
                        </div>
                            <a class='btn-download' href='/api/knowledgebase/file/{entry.Id}?download=true'>
                                <svg width='16' height='16' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                    <path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4'></path>
                                </svg>
                                Download Document
                            </a>
                    </div>
                    <div class='content-body'>{encodedContent}</div>
                    <div class='actions'>
                        <span>Plant Industrial Automation Support System (IPMS)</span>
                        <span>RAG Verified Document</span>
                    </div>
                </div>
            </body>
            </html>";

            return Content(html, "text/html; charset=utf-8");
        }
    }
    public class UpdateManualRequest
    {
        public string Title { get; set; } = string.Empty;
        public string Keywords { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string? ModifiedBy { get; set; }
    }
}