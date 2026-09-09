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

        [HttpPost("ask")]
        public async Task<IActionResult> Ask([FromForm] string prompt)
        {
            var stopwatch = Stopwatch.StartNew();

            // 1. Retrieve the relevant manual from the SQLite database
            var allManuals = await _context.KnowledgeBaseEntries.ToListAsync();
            var matchedManual = allManuals.FirstOrDefault(m =>
                m.Keywords.Split(',').Any(k => prompt.Contains(k.Trim(), StringComparison.OrdinalIgnoreCase))
            );

            // 2. Augment the Prompt (RAG logic)
            string systemInstruction = matchedManual != null
                ? $"[OFFICIAL MANUAL: {matchedManual.Title}]\n{matchedManual.Content}\n\nINSTRUCTION: You are an IPMS safety assistant. Answer the user's question using ONLY the manual above. Format as a clean step-by-step list."
                : "INSTRUCTION: You are an IPMS industrial troubleshooting assistant. You only answer questions related to mill equipment, machinery, and factory safety.";

            // Trap the user prompt inside strict boundaries
            string augmentedPrompt = $@"
{systemInstruction}

USER QUESTION: {prompt}

CRITICAL RULE: Is the user's question related to industrial equipment or the manual?
- If YES: Answer the question using ONLY the provided manual.
- If NO: Reply EXACTLY with 'Error: Query out of scope. I can only assist with IPMS industrial troubleshooting.'
";

            try
            {
                // 3. Send augmented prompt to the local Ollama model
                string solution = await _ollamaService.GenerateTroubleshootingGuideAsync(augmentedPrompt);
                stopwatch.Stop();

                // 4. Log the telemetry
                var log = new TelemetryLog
                {
                    Prompt = prompt,
                    Response = solution,
                    LatencyMs = stopwatch.ElapsedMilliseconds,
                    Timestamp = DateTime.UtcNow,
                    IsSuccessful = true
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
                    Prompt = prompt,
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
    }
}