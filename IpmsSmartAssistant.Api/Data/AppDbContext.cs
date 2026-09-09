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
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<KnowledgeBaseEntry>().HasData(
                new KnowledgeBaseEntry 
                { 
                    Id = 1, 
                    Title = "Weighbridge Sensor Calibration", 
                    Keywords = "weighbridge, calibration, sensor, weight, scale", 
                    Content = "1. Ensure the weighbridge is completely empty.\n2. Access the calibration menu on the main terminal.\n3. Enter the admin override password.\n4. Perform a zero-calibration routine.\n5. Place the standard test weights and record the span calibration." 
                },
                new KnowledgeBaseEntry 
                { 
                    Id = 2, 
                    Title = "Boiler Pressure Fault Warning", 
                    Keywords = "boiler, pressure, overpressure, valve, alarm, fault", 
                    Content = "1. Immediately check the physical pressure gauge.\n2. If pressure exceeds 15 bar, manually open the safety release valve.\n3. Shut down the main burner.\n4. Inspect the pressure sensor wiring for loose connections before restarting." 
                },
                new KnowledgeBaseEntry 
                { 
                    Id = 3, 
                    Title = "Conveyor Belt Misalignment", 
                    Keywords = "conveyor, belt, off-center, jam, alignment, roller", 
                    Content = "1. Stop the conveyor motor immediately.\n2. Locate the tensioning bolts on the tail pulley.\n3. Adjust the bolt on the side the belt is rubbing against by 1/4 turn clockwise.\n4. Run the belt empty for 2 minutes to verify centering." 
                }
            );
        }
    }
}