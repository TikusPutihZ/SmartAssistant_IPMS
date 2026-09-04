using Microsoft.EntityFrameworkCore;
using IpmsSmartAssistant.Api.Models;

namespace IpmsSmartAssistant.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<TelemetryLog> TelemetryLogs => Set<TelemetryLog>();
    public DbSet<KnowledgeBaseEntry> KnowledgeBaseEntries => Set<KnowledgeBaseEntry>();
}