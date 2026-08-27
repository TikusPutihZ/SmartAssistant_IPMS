using Microsoft.AspNetCore.Mvc;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace IpmsSmartAssistant.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ChatController : ControllerBase
{
    private static readonly HttpClient _httpClient = new HttpClient
    {
        BaseAddress = new Uri("http://localhost:11434"),
        Timeout = TimeSpan.FromMinutes(3)
    };

    [HttpPost("ask")]
    public async Task<IActionResult> AskTroubleshooter([FromForm] string prompt, IFormFile? screenshot)
    {
        string? base64Image = null;

        if (screenshot != null && screenshot.Length > 0)
        {
            using var ms = new MemoryStream();
            await screenshot.CopyToAsync(ms);
            byte[] fileBytes = ms.ToArray();
            base64Image = Convert.ToBase64String(fileBytes);
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

        var jsonContent = new StringContent(
            JsonSerializer.Serialize(requestPayload),
            Encoding.UTF8,
            "application/json"
        );

        var response = await _httpClient.PostAsync("/api/generate", jsonContent);
        response.EnsureSuccessStatusCode();

        var responseBody = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<OllamaResponse>(responseBody);

        return Ok(new
        {
            Success = true,
            Solution = result?.Response ?? "No response generated.",
            Timestamp = DateTime.UtcNow
        });
    }

    public class OllamaRequest
    {
        [JsonPropertyName("model")]
        public string Model { get; set; } = string.Empty;

        [JsonPropertyName("prompt")]
        public string Prompt { get; set; } = string.Empty;

        [JsonPropertyName("stream")]
        public bool Stream { get; set; } = false;

        [JsonPropertyName("images")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public List<string>? Images { get; set; }
    }

    public class OllamaResponse
    {
        [JsonPropertyName("response")]
        public string Response { get; set; } = string.Empty;
    }
}