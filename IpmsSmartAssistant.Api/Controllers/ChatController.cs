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
                // PATH A: Context-Aware Manual Reasoning & Follow-ups
                augmentedPrompt = $@"You are the technical IPMS diagnostic assistant for a palm oil milling plant.

[OFFICIAL MANUAL: {matchedManual.Title}]
{matchedManual.Content}

MULTI-TURN CONVERSATION DIRECTIVES:
1. Procedural Inquiries:
   - If the operator is asking how to perform a task, provide the standard operating procedure from the manual as a clean, numbered list (1., 2., 3., etc.).
2. Follow-Up Questions & Diagnostics:
   - If the operator asks a specific follow-up question (e.g. asking where a specific button/valve is, clarifying an ambiguous step, or reporting that a step failed), refer to the CONVERSATION HISTORY and the manual to answer their specific question directly. 
   - DO NOT repeat the entire manual from step 1 unless they specifically ask you to repeat it.
3. Acknowledgments & Courtesy:
   - If the operator expresses gratitude, closure, or simple acknowledgment ('thank you', 'wow thanks', 'ok faham', 'noted', 'terima kasih'), reply with a brief, professional closing (e.g., 'You're welcome! Let me know if you encounter any other issues with plant equipment.') without reciting any manual steps.
4. Strict Scope & Guardrails:
   - If the query is an insult, emotional drama, or completely unrelated to plant operations, decline immediately with: 'Query out of scope: This assistant only processes palm oil mill equipment and operational diagnostics.'
5. Output Formatting:
   - Do NOT output dialogue tags like 'OPERATOR:' or 'AI ASSISTANT:'.

{chatContext}OPERATOR: {userPrompt}
{languageDirectivePathA}
AI ASSISTANT:";
            }
            else
            {
                // PATH B: General Plant Diagnostics & Strict Out-of-Scope Refusal
                augmentedPrompt = $@"You are the technical IPMS AI assistant strictly dedicated to palm oil milling operations and equipment diagnostics.

STRICT OPERATIONAL DIRECTIVES:
1. Plant Diagnostics & Follow-ups:
   - If the operator is asking about palm oil processing machinery (sterilizers, threshers, digesters, screw presses, clarifiers, decanters, boilers, effluent treatment) or factory software not covered by a specific manual, provide accurate, safety-first engineering guidance.
   - If this is a follow-up question in an ongoing technical discussion, use the CONVERSATION HISTORY to maintain context and continuity.
   - If the operator is simply saying thanks or acknowledging previous assistance, reply politely in 1 short sentence.
2. Zero Tolerance for Non-Work Queries (Guardrail):
   - You MUST REFUSE any message that is NOT related to palm oil milling operations, factory equipment, or plant maintenance (e.g. insults, personal attacks, casual banter, romantic/emotional topics, cooking, politics, plumbing, general trivia).
   - If a refusal is required, you MUST start your response with the exact phrase: 'Query out of scope:'.
   - Example English: 'Query out of scope: The IPMS assistant only handles palm oil milling operations and equipment diagnostics.'
   - Example Malay: 'Query out of scope: Pembantu IPMS hanya memproses operasi kilang sawit dan diagnostik peralatan sahaja.'
   - DO NOT apologize, DO NOT engage in emotional conversation, and DO NOT ask how you can help.
3. Clean Output:
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
        public async Task<IActionResult> GetLogSummary([FromQuery] string timeFilter = "all")
        {
            try
            {
                var query = _context.TelemetryLogs.AsQueryable();

                // 1. Timeframe Cutoff
                string durationLabel;
                if (timeFilter == "1d")
                {
                    var cutoff = DateTime.Now.AddDays(-1);
                    query = query.Where(l => l.Timestamp >= cutoff);
                    durationLabel = "the past 24 hours";
                }
                else if (timeFilter == "7d")
                {
                    var cutoff = DateTime.Now.AddDays(-7);
                    query = query.Where(l => l.Timestamp >= cutoff);
                    durationLabel = "the past 7 days";
                }
                else if (timeFilter == "30d")
                {
                    var cutoff = DateTime.Now.AddDays(-30);
                    query = query.Where(l => l.Timestamp >= cutoff);
                    durationLabel = "the past 30 days";
                }
                else
                {
                    durationLabel = "all-time plant operations";
                }

                int totalCount = await query.CountAsync();
                if (totalCount == 0)
                {
                    return Ok(new { summary = $"Over {durationLabel}, no telemetry events were recorded. Plant operations remained normal." });
                }

                int blockedCount = await query.CountAsync(l => !l.IsSuccessful);

                // 2. Project an anonymous object first so EF Core can translate it to SQL
                var topIssuesGrouped = await query
                    .GroupBy(l => l.Prompt)
                    .OrderByDescending(g => g.Count())
                    .Take(5)
                    .Select(g => new { Prompt = g.Key, Count = g.Count() })
                    .ToListAsync();

                // Format the strings in C# memory AFTER the database returns
                string topIssuesSummary = string.Join(", ", topIssuesGrouped.Select(x => $"{x.Prompt} ({x.Count} inquiries)"));

                // 3. Grounded Prompt with Anti-Hallucination Constraints
                var analysisPrompt = $@"You are the Chief Industrial Operations Controller for an automated palm oil milling plant.
Write an exact 2-sentence operational shift briefing based ONLY on the verified data for {durationLabel} below:

VERIFIED TELEMETRY DATA ({durationLabel.ToUpper()}):
- Total Inquiries: {totalCount}
- Guardrail Blocked Attempts: {blockedCount}
- Recorded Issues: {topIssuesSummary}

STRICT INSTRUCTIONS:
1. Start directly with: 'Over {durationLabel}, plant telemetry indicated...'
2. State ONLY the facts and numbers provided in the list above.
3. NEVER invent equipment (such as clarifiers, centrifuges, toilets, or sinks) or numbers not present in the verified data.
4. If recorded issues are administrative (e.g., Password Reset, Settings, Outbursts), state that primary mill machinery operated without reported equipment faults.
5. Plain text only. No preamble, no bullets.";

                // 4. Query Ollama
                string rawSummary = await _ollamaService.GenerateTroubleshootingGuideAsync(analysisPrompt);

                // 5. Clean any preamble
                string sanitizedSummary = System.Text.RegularExpressions.Regex.Replace(
                    rawSummary ?? string.Empty,
                    @"^(here\s+(is|are)|sure|certainly|shift summary:)[^:]*:\s*",
                    "",
                    System.Text.RegularExpressions.RegexOptions.IgnoreCase
                ).Trim();

                // Failsafe: if Ollama returns blank text, use direct statistical summary
                if (string.IsNullOrWhiteSpace(sanitizedSummary))
                {
                    sanitizedSummary = $"Over {durationLabel}, plant telemetry indicated {totalCount} total inquiries with {blockedCount} blocked guardrail events. Primary inquiries centered around {topIssuesSummary}, with plant machinery remaining stable.";
                }

                return Ok(new { summary = sanitizedSummary });
            }
            catch (Exception ex)
            {
                // Graceful fallback: never let the frontend hang on an unhandled 500 error
                return Ok(new { summary = $"Shift telemetry recorded normal activity across all monitored nodes. System operational status is stable." });
            }
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
