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

            // Check for universal Malay particles (catches informal chat & slang)
            bool isMalay = System.Text.RegularExpressions.Regex.IsMatch(
                userPrompt,
                @"\b(nak|nk|mcm|macam|mana|tak|x|kat|katmana|bang|ni|tu|je|jek|dah|dh|tukar|kenapa|apa|saya|awak|bole|boleh|kau|aku|dia|kita|kami)\b",
                System.Text.RegularExpressions.RegexOptions.IgnoreCase
            );

            // Separate directive for Path A (with manual) vs Path B (fallback/general)
            string languageDirectivePathA = isMalay
                ? "DIRECTIVE: The operator is speaking Bahasa Melayu. You MUST translate all manual steps and reply 100% in Bahasa Melayu."
                : "DIRECTIVE: Reply in English.";

            string languageDirectivePathB = isMalay
                ? "DIRECTIVE: Reply in Bahasa Melayu."
                : "DIRECTIVE: Reply in English.";

            if (!string.IsNullOrEmpty(imageBase64))
            {
                // PATH C: Vision-First Spatial Localization & Diagnostics
                augmentedPrompt = $@"You are a sharp, direct IPMS technical and UI assistant.

TASK:
The operator has uploaded a screenshot or plant image and is asking a question about it.
Examine the visual elements, text, buttons, and icons in the image carefully.

SPATIAL GUIDANCE RULES:
1. Direct Location Pinpointing:
   - Identify the exact visual location on screen (e.g. 'sudut atas sebelah kanan', 'sidebar sebelah kiri', 'bahagian header').
   - Mention visual cues like colors, icons, and exact text labels (e.g. 'bulatan warna ungu dengan ikon orang', 'butang Settings dengan ikon gear').
2. Handling UI Steps:
   - If the operator asks about 'Step 1' (User Avatar), point out the avatar icon at the top-right. If the menu is already open, tell them what to click next (e.g. Settings on the left sidebar).
3. Do NOT give excuses like 'lokasi tidak jelas' or recite full manuals. Answer where to click in 2 to 4 concise sentences.
4. Language: If the operator asks in Malay, answer directly in natural, friendly Bahasa Melayu.

IN-CONTEXT EXAMPLE:
Operator: 'mana patut saya tekan ea utk step 1 tu'
AI ASSISTANT: 'Untuk Step 1 (User Avatar), ia adalah ikon bulatan ungu di sudut atas sebelah kanan (bersebelahan ikon loceng). Memandangkan menu profil tersebut sudah terbuka, pilihan untuk akaun atau tetapan sebenarnya terletak pada menu sebelah kiri iaitu ikon gear ""Settings"" di bawah bahagian ""Your account"".'

{chatContext}OPERATOR: {userPrompt}
{languageDirectivePathB}
AI ASSISTANT:";
            }
            else if (matchedManual != null)
            {
                // PATH A: Manual Found
                augmentedPrompt = $@"You are a helpful, professional IPMS industrial safety and diagnostic assistant.

[OFFICIAL MANUAL: {matchedManual.Title}]
{matchedManual.Content}

IN-CONTEXT EXAMPLES:
- Operator: 'how do I reset password?' -> AI: '1. Navigate to the main dashboard...'
- Operator: 'mcm mana nak tukar password bang' -> AI: '1. Pergi ke papan pemuka utama...'

INSTRUCTIONS:
1. Provide the troubleshooting steps from the manual as a numbered list (1., 2., 3., etc.) with line breaks between steps.
2. If the query is completely unrelated to plant operations (e.g. cooking, toilet), politely decline as 'Query out of scope'.
3. Do NOT output dialogue tags like 'OPERATOR:' or 'AI ASSISTANT:'.

{chatContext}OPERATOR: {userPrompt}
{languageDirectivePathA}
AI ASSISTANT:";
            }
            else
            {
                // PATH B: No Manual / Out-of-Scope
                augmentedPrompt = $@"You are a friendly, professional IPMS safety and diagnostics AI assistant for palm oil processing plants.

CRITICAL INSTRUCTIONS:
1. OUT-OF-SCOPE ENFORCEMENT:
   - If the operator asks about anything outside palm oil mill machinery and industrial software (e.g., tandas/toilet, tandas tersumbat, sinki, makanan/cooking, cuaca, hal peribadi):
   - You MUST politely decline and explicitly state the phrase 'Query out of scope' (e.g., 'Query out of scope: Maaf, saya hanya membantu berkenaan mesin dan sistem kilang...').
   - Do NOT attempt to provide plumbing or general advice.

2. CASUAL CHAT & GREETINGS:
   - If the user is greeting, saying thanks, or reacting ('terima kasih', 'ok bang', 'takpe'), reply warmly in 1 to 2 sentences.

3. CLEAN OUTPUT:
   - Do NOT repeat 'OPERATOR:' or 'AI ASSISTANT:'.

{chatContext}OPERATOR: {userPrompt}
{languageDirectivePathB}
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

                    bool isBlocked = solution.Contains("out of scope", StringComparison.OrdinalIgnoreCase)
                                  || solution.Contains("luar skop", StringComparison.OrdinalIgnoreCase);

                    var log = new TelemetryLog
                    {
                        Prompt = mainProblemLabel,
                        Response = solution,
                        LatencyMs = stopwatch.ElapsedMilliseconds,
                        Timestamp = DateTime.Now,
                        IsSuccessful = !isBlocked
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

        [HttpPost("generate-report")]
        public async Task<IActionResult> GenerateReport([FromBody] ReportRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Prompt))
            {
                return BadRequest("Prompt cannot be empty.");
            }

            try
            {
                // Directly generate the report via Ollama without polluting operator telemetry logs
                string report = await _ollamaService.GenerateTroubleshootingGuideAsync(request.Prompt, null);
                return Ok(new { report });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
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

    public class ReportRequest
    {
        public string Prompt { get; set; }
    }

}
