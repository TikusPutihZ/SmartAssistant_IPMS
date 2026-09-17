using System;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using IpmsSmartAssistant.Api.Data;
using IpmsSmartAssistant.Api.Models;
using IpmsSmartAssistant.Api.Services; // Ensure this matches your service folder namespace

namespace IpmsSmartAssistant.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ChatController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly OllamaService _ollamaService;

        public ChatController(AppDbContext context, OllamaService ollamaService)
        {
            _context = context;
            _ollamaService = ollamaService;
        }

        public class ChatRequest
        {
            public string Prompt { get; set; } = string.Empty;
            public string? ImageBase64 { get; set; }
        }

        [HttpPost("ask")]
        public async Task<IActionResult> Ask([FromBody] ChatRequest request)
        {
            // Extract values from the incoming JSON request
            string userPrompt = request?.Prompt ?? string.Empty;
            string? imageBase64 = request?.ImageBase64;
            var stopwatch = Stopwatch.StartNew();

            // 1. Retrieve the manual (Added safety check for m.Keywords != null)
            var matchedManual = await _context.KnowledgeBaseEntries
                .FirstOrDefaultAsync(m => m.Keywords != null && userPrompt.ToLower().Contains(m.Keywords.ToLower()));

            // 2. Split the AI Prompt Logic
            string augmentedPrompt;

            if (!string.IsNullOrEmpty(imageBase64))
            {
                // PATH C: Image attached - Route to multi-modal vision logic
                augmentedPrompt = $"Analyze this industrial equipment image and operator query. USER QUERY: {userPrompt}";
            }
            else if (matchedManual != null)
            {
                // PATH A: Manual found. Force it to answer. Do NOT include the rejection rule.
                augmentedPrompt = $@"You are an IPMS safety assistant. 
[OFFICIAL MANUAL: {matchedManual.Title}]
{matchedManual.Content}

INSTRUCTION: Answer the following user question using ONLY the manual provided above. Provide a clear step-by-step list.
USER QUESTION: {userPrompt}";
            }
            else
            {
                // PATH B: No manual found. Apply the strict guardrail.
                augmentedPrompt = $@"You are an IPMS industrial troubleshooting assistant. 
USER QUESTION: {userPrompt}

CRITICAL RULE: If the question is about a recipe, poem, general coding, or casual chat, you MUST reply EXACTLY with: 'Error: Query out of scope. I can only assist with IPMS industrial troubleshooting.' Otherwise, answer the industrial query based on general safety.";
            }

            try
            {
                // 3. Send augmented prompt and image to the local Ollama model
                // *CRITICAL*: Make sure GenerateTroubleshootingGuideAsync in OllamaService.cs is updated to accept the imageBase64 parameter!
                string solution = await _ollamaService.GenerateTroubleshootingGuideAsync(augmentedPrompt, imageBase64);
                stopwatch.Stop();

                // 4. Log the telemetry
                var log = new TelemetryLog
                {
                    Prompt = userPrompt,
                    Response = solution,
                    LatencyMs = stopwatch.ElapsedMilliseconds,
                    Timestamp = DateTime.UtcNow,
                    IsSuccessful = !solution.Contains("Error: Query out of scope")
                };
                _context.TelemetryLogs.Add(log);
                await _context.SaveChangesAsync();

                return Ok(new { solution = solution, latency = $"{stopwatch.ElapsedMilliseconds} ms" });
            }
            catch (Exception ex)
            {
                stopwatch.Stop();

                // Log failed attempt
                var errorLog = new TelemetryLog
                {
                    Prompt = userPrompt,
                    Response = $"Error: {ex.Message}",
                    LatencyMs = stopwatch.ElapsedMilliseconds,
                    Timestamp = DateTime.UtcNow,
                    IsSuccessful = false
                };
                _context.TelemetryLogs.Add(errorLog);
                await _context.SaveChangesAsync();

                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpGet("logs")]
        public async Task<IActionResult> GetLogs()
        {
            // Retrieve the 10 most recent telemetry logs
            var logs = await _context.TelemetryLogs
                .OrderByDescending(l => l.Timestamp)
                .Take(10)
                .ToListAsync();

            return Ok(logs);
        }
        [HttpGet("stats")]
        public async Task<IActionResult> GetTelemetryStats()
        {
            // 1. Count every log in the database
            var totalQueries = await _context.TelemetryLogs.CountAsync();

            // 2. Count logs where the guardrail blocked the query
            // (Assuming IsSuccessful is false for out-of-scope queries)
            var blockedAttempts = await _context.TelemetryLogs.CountAsync(l => l.IsSuccessful == false);

            // 3. Find the most frequently asked prompt using a SQL GROUP BY
            var topIssue = await _context.TelemetryLogs
                .GroupBy(l => l.Prompt)
                .OrderByDescending(g => g.Count())
                .Select(g => g.Key)
                .FirstOrDefaultAsync() ?? "No data yet";

            // Return the data as a clean JSON object
            return Ok(new
            {
                TotalQueries = totalQueries,
                BlockedAttempts = blockedAttempts,
                TopIssue = topIssue
            });
        }

        [HttpGet("summary")]
        public async Task<IActionResult> GetLogSummary()
        {
            // 1. Grab the most recent operator queries
            var recentLogs = await _context.TelemetryLogs
                .OrderByDescending(l => l.Timestamp)
                .Take(20)
                .Select(l => l.Prompt)
                .ToListAsync();

            if (!recentLogs.Any())
                return Ok(new { summary = "No telemetry logs available to summarize." });

            // 2. Build a hidden prompt instructing Ollama to act as a data analyst
            var analysisPrompt = "You are a factory analytics AI. Read the following recent queries from industrial operators and write a concise, 2-sentence shift summary. Mention any recurring equipment issues:\n\n"
                                 + string.Join("\n- ", recentLogs);

            // 3. Send to your local LLM
            var summaryResponse = await _ollamaService.GenerateTroubleshootingGuideAsync(analysisPrompt);

            return Ok(new { summary = summaryResponse });
        }

    }

    public class ChatRequest
    {
        public string Prompt { get; set; } = string.Empty;
        public string? ImageBase64 { get; set; }
    }


}