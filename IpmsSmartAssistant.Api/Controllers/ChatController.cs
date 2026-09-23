using System;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using IpmsSmartAssistant.Api.Data;
using IpmsSmartAssistant.Api.Models;
using IpmsSmartAssistant.Api.Services;

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
        public async Task<IActionResult> Ask([FromBody] ChatRequest request)
        {
            // Safely extract the prompt and image from the incoming JSON request
            string userPrompt = request?.Prompt ?? string.Empty;
            string? imageBase64 = request?.ImageBase64;
            var stopwatch = Stopwatch.StartNew();

            // Ask AI to translate the Malay prompt into English keywords for better matching
            string translationPrompt = $"You are an industrial translator. Extract the core equipment name and issue from this query and translate it to simple English keywords. Respond ONLY with the English keywords, no explanations. QUERY: {userPrompt}";
            string englishKeywords = await _ollamaService.GenerateTroubleshootingGuideAsync(translationPrompt, null);

            // Combine the original Malay prompt with the English AI translation
            string combinedSearchTerms = userPrompt.ToLower() + " " + englishKeywords.ToLower();


            // 1. Retrieve all manuals for in-memory fuzzy matching
            var allManuals = await _context.KnowledgeBaseEntries.ToListAsync();
            KnowledgeBaseEntry matchedManual = null;
            int highestScore = 0;

            // Clean and split the COMBINED text into searchable words
            var promptWords = combinedSearchTerms
                .Split(new[] { ' ', '?', '.', ',', '!', '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries)
                .Where(w => w.Length >= 4); // Only look at substantial words

            foreach (var manual in allManuals)
            {
                int currentScore = 0;

                string titleSafe = manual.Title ?? "";
                string keywordSafe = manual.Keywords ?? "";
                var searchableText = (titleSafe + " " + keywordSafe).ToLower();

                var titleWords = searchableText.Split(new[] { ' ', '?', '.', ',' }, StringSplitOptions.RemoveEmptyEntries);

                foreach (var pWord in promptWords)
                {
                    foreach (var tWord in titleWords)
                    {
                        if (tWord == pWord)
                        {
                            currentScore += 10;
                        }
                        else if (tWord.Contains(pWord) || pWord.Contains(tWord))
                        {
                            currentScore += 5;
                        }
                        else if (tWord.Length >= 4 && pWord.Substring(0, 4) == tWord.Substring(0, 4))
                        {
                            currentScore += 3;
                        }
                    }
                }

                if (currentScore > highestScore)
                {
                    highestScore = currentScore;
                    matchedManual = manual;
                }
            }

            if (highestScore < 3)
            {
                matchedManual = null;
            }

            // 2. Split the AI Prompt Logic
            string augmentedPrompt;

            if (!string.IsNullOrEmpty(imageBase64))
            {
                // PATH C: Image attached
                augmentedPrompt = $"Analyze this industrial equipment image and operator query. CRITICAL RULE: You must reply entirely in the exact same language the user is speaking. USER QUERY: {userPrompt}";
            }
            else if (matchedManual != null)
            {
                // PATH A: Manual found. Force strict translation at the end of the prompt.
                augmentedPrompt = $@"You are an IPMS safety assistant. 

[OFFICIAL MANUAL: {matchedManual.Title}]
{matchedManual.Content}

CRITICAL INSTRUCTIONS:
1. Answer the user's question using ONLY the manual provided above. Provide a clear step-by-step list.
2. You MUST detect the language of the USER QUESTION below. 
3. TRANSLATE your entire response into that exact same language. If the user asks in Bahasa Melayu, you MUST reply 100% in Bahasa Melayu.

USER QUESTION: {userPrompt}";
            }
            else
            {
                // PATH B: No manual found. Apply the strict guardrail.
                augmentedPrompt = $@"You are an IPMS industrial troubleshooting assistant. 

CRITICAL RULE: If the question is about a recipe, poem, general coding, or casual chat, you MUST reply EXACTLY with: 'Error: Query out of scope.' (Translate this error to the user's language). 
Otherwise, answer the industrial query based on general safety. ALWAYS reply in the exact same language as the USER QUESTION.

USER QUESTION: {userPrompt}";
            }

            try
            {
                // 3. Send augmented prompt and image to the local Ollama model
                string solution = await _ollamaService.GenerateTroubleshootingGuideAsync(augmentedPrompt, imageBase64);
                stopwatch.Stop();

                // 4. Log the telemetry
                var log = new TelemetryLog
                {
                    Prompt = userPrompt,
                    Response = solution,
                    LatencyMs = stopwatch.ElapsedMilliseconds,
                    Timestamp = DateTime.Now,
                    IsSuccessful = !solution.Contains("Error: Query out of scope") && !solution.Contains("Query out of scope")
                };
                _context.TelemetryLogs.Add(log);
                await _context.SaveChangesAsync();

                return Ok(new { solution = solution, latency = $"{stopwatch.ElapsedMilliseconds} ms" });
            }
            catch (Exception ex)
            {
                stopwatch.Stop();

                var errorLog = new TelemetryLog
                {
                    Prompt = userPrompt,
                    Response = $"Error: {ex.Message}",
                    LatencyMs = stopwatch.ElapsedMilliseconds,
                    Timestamp = DateTime.Now,
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
            var logs = await _context.TelemetryLogs
                .OrderByDescending(l => l.Timestamp)
                .Take(10)
                .ToListAsync();

            return Ok(logs);
        }

        [HttpGet("stats")]
        public async Task<IActionResult> GetTelemetryStats()
        {
            var totalQueries = await _context.TelemetryLogs.CountAsync();
            var blockedAttempts = await _context.TelemetryLogs.CountAsync(l => l.IsSuccessful == false);
            var topIssue = await _context.TelemetryLogs
                .GroupBy(l => l.Prompt)
                .OrderByDescending(g => g.Count())
                .Select(g => g.Key)
                .FirstOrDefaultAsync() ?? "No data yet";

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
            var recentLogs = await _context.TelemetryLogs
                .OrderByDescending(l => l.Timestamp)
                .Take(20)
                .Select(l => l.Prompt)
                .ToListAsync();

            if (!recentLogs.Any())
                return Ok(new { summary = "No telemetry logs available to summarize." });

            var analysisPrompt = "You are a factory analytics AI. Read the following recent queries from industrial operators and write a concise, 2-sentence shift summary. Mention any recurring equipment issues:\n\n"
                                 + string.Join("\n- ", recentLogs);

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