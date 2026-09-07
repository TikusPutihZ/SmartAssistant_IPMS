using Microsoft.AspNetCore.Mvc;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Diagnostics;
using IpmsSmartAssistant.Api.Data;
using IpmsSmartAssistant.Api.Models;

namespace IpmsSmartAssistant.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ChatController : ControllerBase
{
    private readonly AppDbContext _dbContext;
    private static readonly HttpClient _httpClient = new HttpClient
    {
        BaseAddress = new Uri("http://localhost:11434"),
        Timeout = TimeSpan.FromMinutes(3)
    };

    // Inject the database context via the constructor
    public ChatController(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpPost("ask")]
    public async Task<IActionResult> AskTroubleshooter([FromForm] string prompt, IFormFile? screenshot)
    {
        var sw = Stopwatch.StartNew();
        string? base64Image = null;
        string finalSolution = "No response generated.";
        bool isSuccess = false;

        try
        {
            if (screenshot != null && screenshot.Length > 0)
            {
                using var ms = new MemoryStream();
                await screenshot.CopyToAsync(ms);
                base64Image = Convert.ToBase64String(ms.ToArray());
            }

            var fullPrompt = $"You are the technical assistant for FGV IPMS mill operators. " +
                             $"Provide a concise, step-by-step checklist to resolve this issue: {prompt}";

            var requestPayload = new OllamaRequest
            {
                Model = "llava",
                Prompt = fullPrompt,
                Stream = false,
                Images = string.IsNullOrEmpty(base64Image) ? null : new List<string> { base64Image }
            };

            var jsonContent = new StringContent(JsonSerializer.Serialize(requestPayload), Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync("/api/generate", jsonContent);
            response.EnsureSuccessStatusCode();

            var responseBody = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<OllamaResponse>(responseBody);
            
            finalSolution = result?.Response ?? finalSolution;
            isSuccess = true;
        }
        catch (Exception ex)
        {
            finalSolution = $"Error communicating with local AI model: {ex.Message}";
        }
        finally
        {
            sw.Stop();

            // Save the interaction to the SQLite database
            var log = new TelemetryLog
            {
                UserPrompt = prompt,
                ResolutionOutput = finalSolution,
                HasScreenshot = screenshot != null,
                LatencyMs = sw.ElapsedMilliseconds,
                IsSuccess = isSuccess
            };

            _dbContext.TelemetryLogs.Add(log);
            await _dbContext.SaveChangesAsync();
        }

        return Ok(new
        {
            Success = isSuccess,
            Solution = finalSolution,
            Latency = $"{sw.ElapsedMilliseconds} ms",
            Timestamp = DateTime.UtcNow
        });
    }

    public class OllamaRequest
    {
        [JsonPropertyName("model")] public string Model { get; set; } = string.Empty;
        [JsonPropertyName("prompt")] public string Prompt { get; set; } = string.Empty;
        [JsonPropertyName("stream")] public bool Stream { get; set; } = false;
        [JsonPropertyName("images")] [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] public List<string>? Images { get; set; }
    }

    public class OllamaResponse
    {
        [JsonPropertyName("response")] public string Response { get; set; } = string.Empty;
    }
}