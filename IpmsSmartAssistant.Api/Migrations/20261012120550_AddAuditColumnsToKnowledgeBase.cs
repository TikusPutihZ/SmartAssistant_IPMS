using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace IpmsSmartAssistant.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddAuditColumnsToKnowledgeBase : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "LastModifiedAt",
                table: "KnowledgeBaseEntries",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LastModifiedBy",
                table: "KnowledgeBaseEntries",
                type: "TEXT",
                nullable: true);

            migrationBuilder.UpdateData(
                table: "KnowledgeBaseEntries",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "LastModifiedAt", "LastModifiedBy" },
                values: new object[] { null, null });

            migrationBuilder.UpdateData(
                table: "KnowledgeBaseEntries",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "LastModifiedAt", "LastModifiedBy" },
                values: new object[] { null, null });

            migrationBuilder.UpdateData(
                table: "KnowledgeBaseEntries",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "LastModifiedAt", "LastModifiedBy" },
                values: new object[] { null, null });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LastModifiedAt",
                table: "KnowledgeBaseEntries");

            migrationBuilder.DropColumn(
                name: "LastModifiedBy",
                table: "KnowledgeBaseEntries");
        }
    }
}
