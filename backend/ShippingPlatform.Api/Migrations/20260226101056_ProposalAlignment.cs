using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ShippingPlatform.Api.Migrations
{
    /// <inheritdoc />
    public partial class ProposalAlignment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ShipmentSequences_OriginWarehouseCode_Year",
                table: "ShipmentSequences");

            migrationBuilder.DropColumn(
                name: "OriginWarehouseCode",
                table: "ShipmentSequences");

            migrationBuilder.AddColumn<decimal>(
                name: "MaxVolumeM3",
                table: "Shipments",
                type: "decimal(65,30)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "MaxWeightKg",
                table: "Shipments",
                type: "decimal(65,30)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "TotalVolumeM3",
                table: "Shipments",
                type: "decimal(65,30)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "TotalWeightKg",
                table: "Shipments",
                type: "decimal(65,30)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<bool>(
                name: "HasPricingOverride",
                table: "Packages",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "PricingOverrides",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    PackageId = table.Column<int>(type: "int", nullable: false),
                    OverrideType = table.Column<int>(type: "int", nullable: false),
                    OriginalValue = table.Column<decimal>(type: "decimal(65,30)", nullable: false),
                    NewValue = table.Column<decimal>(type: "decimal(65,30)", nullable: false),
                    Reason = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    AdminUserId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PricingOverrides", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PricingOverrides_Packages_PackageId",
                        column: x => x.PackageId,
                        principalTable: "Packages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_ShipmentSequences_Year",
                table: "ShipmentSequences",
                column: "Year",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PricingOverrides_PackageId",
                table: "PricingOverrides",
                column: "PackageId");

            // Remap ShipmentStatus integer values (applied highest-to-lowest to avoid collisions):
            // Old: Draft=0, Scheduled=1, ReadyToDepart=2, Departed=3, Arrived=4, Closed=5, Cancelled=6
            // New: Draft=0, Pending=1, NearlyFull=2, Loaded=3, Shipped=4, Arrived=5, Completed=6, Closed=7, Cancelled=8
            migrationBuilder.Sql("UPDATE `Shipments` SET `Status` = 8 WHERE `Status` = 6;"); // Cancelled
            migrationBuilder.Sql("UPDATE `Shipments` SET `Status` = 6 WHERE `Status` = 5;"); // Closed → Completed
            migrationBuilder.Sql("UPDATE `Shipments` SET `Status` = 5 WHERE `Status` = 4;"); // Arrived
            migrationBuilder.Sql("UPDATE `Shipments` SET `Status` = 4 WHERE `Status` = 3;"); // Departed → Shipped
            migrationBuilder.Sql("UPDATE `Shipments` SET `Status` = 3 WHERE `Status` = 2;"); // ReadyToDepart → Loaded
            // Draft(0) and Scheduled(1)→Pending(1) are already correct
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PricingOverrides");

            migrationBuilder.DropIndex(
                name: "IX_ShipmentSequences_Year",
                table: "ShipmentSequences");

            migrationBuilder.DropColumn(
                name: "MaxVolumeM3",
                table: "Shipments");

            migrationBuilder.DropColumn(
                name: "MaxWeightKg",
                table: "Shipments");

            migrationBuilder.DropColumn(
                name: "TotalVolumeM3",
                table: "Shipments");

            migrationBuilder.DropColumn(
                name: "TotalWeightKg",
                table: "Shipments");

            migrationBuilder.DropColumn(
                name: "HasPricingOverride",
                table: "Packages");

            migrationBuilder.AddColumn<string>(
                name: "OriginWarehouseCode",
                table: "ShipmentSequences",
                type: "varchar(3)",
                maxLength: 3,
                nullable: false,
                defaultValue: "")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_ShipmentSequences_OriginWarehouseCode_Year",
                table: "ShipmentSequences",
                columns: new[] { "OriginWarehouseCode", "Year" },
                unique: true);
        }
    }
}
