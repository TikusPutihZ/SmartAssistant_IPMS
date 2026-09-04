using System.ComponentModel.DataAnnotations;

namespace IpmsSmartAssistant.Api.Models;

public class KnowledgeBaseEntry
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string ErrorCode { get; set; } = string.Empty; // e.g. "ERR_403", "WB_COMM_FAIL"

    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [Required]
    public string Content { get; set; } = string.Empty; // Steps from the manual

    public string? ModuleName { get; set; } // e.g. "Grading", "Weighbridge", "Dispatch"

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}