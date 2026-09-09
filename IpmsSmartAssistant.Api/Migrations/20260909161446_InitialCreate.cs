using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace IpmsSmartAssistant.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "KnowledgeBaseEntries",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Title = table.Column<string>(type: "TEXT", nullable: false),
                    Keywords = table.Column<string>(type: "TEXT", nullable: false),
                    Content = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_KnowledgeBaseEntries", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "TelemetryLogs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Prompt = table.Column<string>(type: "TEXT", nullable: false),
                    Response = table.Column<string>(type: "TEXT", nullable: false),
                    LatencyMs = table.Column<long>(type: "INTEGER", nullable: false),
                    Timestamp = table.Column<DateTime>(type: "TEXT", nullable: false),
                    IsSuccessful = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TelemetryLogs", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "KnowledgeBaseEntries",
                columns: new[] { "Id", "Content", "Keywords", "Title" },
                values: new object[,]
                {
                    { 1, "1. Ensure the weighbridge is completely empty.\n2. Access the calibration menu on the main terminal.\n3. Enter the admin override password.\n4. Perform a zero-calibration routine.\n5. Place the standard test weights and record the span calibration.", "weighbridge, calibration, sensor, weight, scale", "Weighbridge Sensor Calibration" },
                    { 2, "1. Immediately check the physical pressure gauge.\n2. If pressure exceeds 15 bar, manually open the safety release valve.\n3. Shut down the main burner.\n4. Inspect the pressure sensor wiring for loose connections before restarting.", "boiler, pressure, overpressure, valve, alarm, fault", "Boiler Pressure Fault Warning" },
                    { 3, "1. Stop the conveyor motor immediately.\n2. Locate the tensioning bolts on the tail pulley.\n3. Adjust the bolt on the side the belt is rubbing against by 1/4 turn clockwise.\n4. Run the belt empty for 2 minutes to verify centering.", "conveyor, belt, off-center, jam, alignment, roller", "Conveyor Belt Misalignment" }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "KnowledgeBaseEntries");

            migrationBuilder.DropTable(
                name: "TelemetryLogs");
        }
    }
}
