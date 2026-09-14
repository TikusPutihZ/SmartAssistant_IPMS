using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace IpmsSmartAssistant.Api.Migrations
{
    /// <inheritdoc />
    public partial class SeedNewManuals : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "KnowledgeBaseEntries",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "Content", "Keywords", "Title" },
                values: new object[] { "1. Immediately check the physical pressure gauge.\n2. If pressure exceeds 15 bar, manually open the safety release valve.\n3. Shut down the main burner.\n4. Inspect the pressure sensor wiring for loose connections before restarting.", "boiler", "Boiler Pressure Fault" });

            migrationBuilder.UpdateData(
                table: "KnowledgeBaseEntries",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "Content", "Keywords", "Title" },
                values: new object[] { "1. Ensure the weighbridge platform is completely empty and clean.\n2. Access the admin terminal and enter calibration mode.\n3. Perform a zero-point calibration.\n4. Place standard test weights on the platform and verify the digital load cell readings match.", "weighbridge", "Weighbridge Calibration" });

            migrationBuilder.UpdateData(
                table: "KnowledgeBaseEntries",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "Keywords", "Title" },
                values: new object[] { "conveyor", "Conveyor Belt Alignment" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "KnowledgeBaseEntries",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "Content", "Keywords", "Title" },
                values: new object[] { "1. Ensure the weighbridge is completely empty.\n2. Access the calibration menu on the main terminal.\n3. Enter the admin override password.\n4. Perform a zero-calibration routine.\n5. Place the standard test weights and record the span calibration.", "weighbridge, calibration, sensor, weight, scale", "Weighbridge Sensor Calibration" });

            migrationBuilder.UpdateData(
                table: "KnowledgeBaseEntries",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "Content", "Keywords", "Title" },
                values: new object[] { "1. Immediately check the physical pressure gauge.\n2. If pressure exceeds 15 bar, manually open the safety release valve.\n3. Shut down the main burner.\n4. Inspect the pressure sensor wiring for loose connections before restarting.", "boiler, pressure, overpressure, valve, alarm, fault", "Boiler Pressure Fault Warning" });

            migrationBuilder.UpdateData(
                table: "KnowledgeBaseEntries",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "Keywords", "Title" },
                values: new object[] { "conveyor, belt, off-center, jam, alignment, roller", "Conveyor Belt Misalignment" });
        }
    }
}
