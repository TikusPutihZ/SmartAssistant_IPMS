using System.ComponentModel.DataAnnotations;

namespace IpmsSmartAssistant.Api.Models;

public class TelemetryLog
{
    [Key]
    public int Id { get; set; }

    [Required]
    public string UserPrompt { get; set; } = string.Empty;

    public string? ResolutionOutput { get; set; }

    public bool HasScreenshot { get; set; }

    public double LatencyMs { get; set; } // Time taken for Ollama to respond in ms

    public string ModelUsed { get; set; } = "llava";

    public bool IsSuccess { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}