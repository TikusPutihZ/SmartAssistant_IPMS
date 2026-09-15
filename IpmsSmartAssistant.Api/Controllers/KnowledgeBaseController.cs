using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using IpmsSmartAssistant.Api.Data;
using IpmsSmartAssistant.Api.Models;
using UglyToad.PdfPig;

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
        public async Task<IActionResult> GetEntries()
        {
            var entries = await _context.KnowledgeBaseEntries.ToListAsync();
            return Ok(entries);
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
        public async Task<IActionResult> UploadPdf(IFormFile file)
        {
            if (file == null || file.Length == 0 || file.ContentType != "application/pdf")
            {
                return BadRequest(new { message = "Please upload a valid PDF document." });
            }

            try
            {
                // 1. Read the uploaded file stream
                using var stream = file.OpenReadStream();
                
                // 2. Open the PDF securely offline
                using var document = PdfDocument.Open(stream);
                
                var extractedText = new System.Text.StringBuilder();

                // 3. Loop through pages and extract text
                foreach (var page in document.GetPages())
                {
                    extractedText.AppendLine(page.Text);
                }

                // 4. Save to the database 
                // Note: In a production RAG system, you would "chunk" this text into smaller paragraphs here.
                var newEntry = new KnowledgeBaseEntry 
                { 
                    Title = file.FileName.Replace(".pdf", ""), // Use filename as the equipment name
                    Content = extractedText.ToString() 
                };

                _context.KnowledgeBaseEntries.Add(newEntry);
                await _context.SaveChangesAsync();

                return Ok(new { message = "PDF processed and knowledge updated successfully!" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error processing PDF: " + ex.Message });
            }
        }
    }
}