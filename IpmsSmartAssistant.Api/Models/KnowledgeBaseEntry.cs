namespace IpmsSmartAssistant.Api.Models
{
    public class KnowledgeBaseEntry
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Keywords { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
    }
}