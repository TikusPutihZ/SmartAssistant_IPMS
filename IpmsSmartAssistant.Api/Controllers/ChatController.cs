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
            /// Safely extract the prompt and image from the incoming JSON request
            string userPrompt = request?.Prompt ?? string.Empty;
            string? imageBase64 = request?.ImageBase64;
            var stopwatch = Stopwatch.StartNew();


            // COMBINE PREVIOUS CONTEXT FOR ACCURATE SEARCHING
            string previousUserMsg = request.History?.LastOrDefault(h => h.Role == "user")?.Content ?? "";
            string contextualQuery = string.IsNullOrWhiteSpace(previousUserMsg)
                ? userPrompt
                : $"{previousUserMsg}. {userPrompt}";

            // Ask AI to translate the Malay prompt into English keywords for better matching
            string translationPrompt = $@"Extract the main problem from the query in exactly 2 to 4 words. 
DO NOT use labels like 'Equipment:' or 'Issue:'. 
DO NOT write sentences. 

Examples:
Query: 'macam mana nak baiki tali sawat' -> Conveyor Belt Alignment
Query: 'saya x bole nak login website' -> Login Error
Query: 'pressure gauge is at 0' -> Boiler Pressure Fault

Query: '{contextualQuery}' ->"; // <--- THIS NOW USES THE COMBINED CONTEXT

            string englishKeywords = await _ollamaService.GenerateTroubleshootingGuideAsync(translationPrompt, null);

            // Failsafe: Strip out any labels if the AI still tries to be chatty
            englishKeywords = englishKeywords
                .Replace("Core Equipment Name:", "")
                .Replace("Core equipment:", "")
                .Replace("Issue:", "")
                .Replace("None", "")
                .Replace("N/A", "")
                .Trim();

            // Combine the original Malay prompt with the English AI translation
            string combinedSearchTerms = userPrompt.ToLower() + " " + englishKeywords.ToLower();


            // 1. Retrieve all manuals for in-memory fuzzy matching
            var allManuals = await _context.KnowledgeBaseEntries.ToListAsync();
            KnowledgeBaseEntry matchedManual = null;
            int highestScore = 0;

            // Stop words: common words that should NOT cause a manual match on their own
            var stopWords = new HashSet<string> { "fault", "error", "issue", "problem", "broke", "broken", "help", "guide", "manual", "status", "check" };

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

            if (highestScore < 10)
            {
                matchedManual = null;
            }

            // 2. Split the AI Prompt Logic
            string augmentedPrompt;

            string chatContext = "";
            if (request.History != null && request.History.Any())
            {
                chatContext = "CONVERSATION HISTORY:\n";
                var recentHistory = request.History.TakeLast(4);
                foreach (var msg in recentHistory)
                {
                    string roleName = msg.Role == "user" ? "OPERATOR" : "AI ASSISTANT";
                    chatContext += $"{roleName}: {msg.Content}\n";
                }
                chatContext += "\n";
            }

            if (!string.IsNullOrEmpty(imageBase64))
            {
                // PATH C: Vision
                string manualContext = matchedManual != null
                    ? $"[REFERENCE MANUAL: {matchedManual.Title}]\n{matchedManual.Content}\n"
                    : "";

                augmentedPrompt = $@"You are an expert IPMS industrial diagnostic technician.

{manualContext}
INSTRUCTIONS:
1. Examine the attached equipment image closely.
2. Answer the query directly using visual findings and the reference manual if relevant.
3. State whether the equipment is normal or abnormal, with step-by-step resolution.
4. Reply in the exact same language as the user.
5. Never output dialogue labels like 'OPERATOR:' or 'AI ASSISTANT:'.

{chatContext}OPERATOR: {userPrompt}
AI ASSISTANT:";
            }
            else if (matchedManual != null)
            {
                // PATH A: Manual Found
                augmentedPrompt = $@"You are a helpful, professional IPMS industrial safety and diagnostic assistant.

[OFFICIAL MANUAL: {matchedManual.Title}]
{matchedManual.Content}

CRITICAL INSTRUCTIONS:
1. If the operator asks a technical question covered by the manual above, provide clear step-by-step instructions based ONLY on the manual.
2. If the user's query is out-of-scope (home plumbing, recipes, casual gossip), politely decline in a natural tone and mention that this is a 'Query out of scope'.
3. If the user is acknowledging, saying thanks, or making casual remarks, reply in a warm, brief, natural tone (1 to 2 sentences).
4. Do NOT repeat or echo 'OPERATOR:' or 'AI ASSISTANT:'. Output ONLY your direct answer.
5. Reply in the exact same language as the user query.

{chatContext}OPERATOR: {userPrompt}
AI ASSISTANT:";
            }
            else
            {
                // PATH B: No Manual / Out-of-Scope
                augmentedPrompt = $@"You are a friendly, professional IPMS safety and diagnostics AI assistant for palm oil processing plants.

CRITICAL INSTRUCTIONS:
1. If the user is reacting to a previous refusal (e.g., 'u really cant help', 'too bad', 'oh okay', 'nevermind'):
   - Respond in a warm, human, concise way (1 to 2 sentences max). 
   - Example: 'Afraid not! My systems are strictly tuned for plant machinery and safety. If you need any equipment help later, I\'ll be right here.'
   - DO NOT recite your full job description or repeat a long disclaimer.
2. If the user asks a completely new unrelated query (toilet, recipes, homework):
   - Politely decline in a conversational voice, mention that it is a 'Query out of scope', and suggest the appropriate department.
3. If the user is greeting or saying thank you, reply warmly and concisely.
4. Do NOT repeat 'OPERATOR:' or 'AI ASSISTANT:' in your output.
5. Reply in the exact same language as the user query.

{chatContext}OPERATOR: {userPrompt}
AI ASSISTANT:";
            }

            try
            {
                // 3. Send augmented prompt and image to the local Ollama model
                string solution = await _ollamaService.GenerateTroubleshootingGuideAsync(augmentedPrompt, imageBase64);
                stopwatch.Stop();

                // SANITIZATION: Strip out any accidental prefix tags Ollama might echo
                if (!string.IsNullOrEmpty(solution))
                {
                    solution = System.Text.RegularExpressions.Regex.Replace(
                        solution,
                        @"^(OPERATOR:.*?AI ASSISTANT:\s*|USER QUESTION:.*?AI ASSISTANT:\s*|AI ASSISTANT:\s*|AI:\s*)",
                        "",
                        System.Text.RegularExpressions.RegexOptions.IgnoreCase | System.Text.RegularExpressions.RegexOptions.Singleline
                    ).Trim();
                }

                // 4. Log the telemetry ONLY if it's the first question in the chat
                if (request.History == null || request.History.Count == 0)
                {
                    string cleanKeywords = englishKeywords.Replace("\n", " ").Trim().ToLower();
                    string mainProblemLabel = System.Globalization.CultureInfo.CurrentCulture.TextInfo.ToTitleCase(cleanKeywords);

                    var log = new TelemetryLog
                    {
                        Prompt = mainProblemLabel,
                        Response = solution,
                        LatencyMs = stopwatch.ElapsedMilliseconds,
                        Timestamp = DateTime.Now,
                        IsSuccessful = !solution.Contains("out of scope", StringComparison.OrdinalIgnoreCase)
                    };
                    _context.TelemetryLogs.Add(log);
                    await _context.SaveChangesAsync();
                }

                return Ok(new { solution = solution, latency = $"{stopwatch.ElapsedMilliseconds} ms" });
            }
            catch (Exception ex)
            {
                stopwatch.Stop();

                string cleanKeywords = englishKeywords.Replace("\n", " ").Trim().ToLower();
                string mainProblemLabel = System.Globalization.CultureInfo.CurrentCulture.TextInfo.ToTitleCase(cleanKeywords);

                var errorLog = new TelemetryLog
                {
                    Prompt = mainProblemLabel,
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

            // 1. Strict prompt forbidding conversational preambles
            var analysisPrompt = $@"You are the Chief Industrial Operations Controller for an automated palm oil milling plant.
Analyze the following recent operator query logs and write a direct, factual 2-sentence operational shift briefing. Mention recurring equipment issues.

CRITICAL INSTRUCTIONS:
- Start IMMEDIATELY with the facts (e.g., 'The shift recorded technical issues including...').
- DO NOT say 'Here is a summary', 'Sure', or provide any conversational intro.
- DO NOT use markdown headers or bullet points. Output plain text only.

Recent Operator Queries:
- {string.Join("\n- ", recentLogs)}";

            // 2. Query Ollama
            var rawSummary = await _ollamaService.GenerateTroubleshootingGuideAsync(analysisPrompt);

            // 3. Regex Safety Net: Automatically strip any remaining conversational prefix
            string sanitizedSummary = System.Text.RegularExpressions.Regex.Replace(
                rawSummary ?? string.Empty,
                @"^(here\s+(is|are)|sure|certainly|shift summary:)[^:]*:\s*",
                "",
                System.Text.RegularExpressions.RegexOptions.IgnoreCase
            ).Trim();

            return Ok(new { summary = sanitizedSummary });
        }
    }

    public class ChatRequest
    {
        public string Prompt { get; set; } = string.Empty;
        public string? ImageBase64 { get; set; }
        // NEW: Accept chat history from React
        public List<MessageHistory> History { get; set; } = new();
    }

    // NEW: Define the structure of a previous chat bubble
    public class MessageHistory
    {
        public string Role { get; set; } = string.Empty; // "user" or "ai"
        public string Content { get; set; } = string.Empty;
    }
}
