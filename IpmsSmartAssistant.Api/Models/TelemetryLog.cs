using System;

namespace IpmsSmartAssistant.Api.Models
{
    public class TelemetryLog
    {
        public int Id { get; set; }
        public string Prompt { get; set; } = string.Empty;
        public string Response { get; set; } = string.Empty;
        public long LatencyMs { get; set; }
        public DateTime Timestamp { get; set; }
        public bool IsSuccessful { get; set; }
    }
}