using IpmsSmartAssistant.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace IpmsSmartAssistant.Api.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<TelemetryLog> TelemetryLogs { get; set; }
        public DbSet<KnowledgeBaseEntry> KnowledgeBaseEntries { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<KnowledgeBaseEntry>().HasData(
                new KnowledgeBaseEntry
                {
                    Id = 1,
                    Title = "Boiler Pressure Fault",
                    Keywords = "boiler",
                    Content = "1. Immediately check the physical pressure gauge.\n2. If pressure exceeds 15 bar, manually open the safety release valve.\n3. Shut down the main burner.\n4. Inspect the pressure sensor wiring for loose connections before restarting."
                },
                new KnowledgeBaseEntry
                {
                    Id = 2,
                    Title = "Weighbridge Calibration",
                    Keywords = "weighbridge",
                    Content = "1. Ensure the weighbridge platform is completely empty and clean.\n2. Access the admin terminal and enter calibration mode.\n3. Perform a zero-point calibration.\n4. Place standard test weights on the platform and verify the digital load cell readings match."
                },
                new KnowledgeBaseEntry
                {
                    Id = 3,
                    Title = "Conveyor Belt Alignment",
                    Keywords = "conveyor",
                    Content = "1. Stop the conveyor motor immediately.\n2. Locate the tensioning bolts on the tail pulley.\n3. Adjust the bolt on the side the belt is rubbing against by 1/4 turn clockwise.\n4. Run the belt empty for 2 minutes to verify centering."
                }
            );
        }
    }
}