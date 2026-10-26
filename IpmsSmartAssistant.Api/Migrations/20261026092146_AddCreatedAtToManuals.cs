using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace IpmsSmartAssistant.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCreatedAtToManuals : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "KnowledgeBaseEntries",
                type: "TEXT",
                nullable: true);

            migrationBuilder.UpdateData(
                table: "KnowledgeBaseEntries",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: null);

            migrationBuilder.UpdateData(
                table: "KnowledgeBaseEntries",
                keyColumn: "Id",
                keyValue: 2,
                column: "CreatedAt",
                value: null);

            migrationBuilder.UpdateData(
                table: "KnowledgeBaseEntries",
                keyColumn: "Id",
                keyValue: 3,
                column: "CreatedAt",
                value: null);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "KnowledgeBaseEntries");
        }
    }
}
