using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ShippingPlatform.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCustomerPhoneUniqueIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ExternalCarrierName",
                table: "Shipments");

            migrationBuilder.DropColumn(
                name: "ExternalDestination",
                table: "Shipments");

            migrationBuilder.DropColumn(
                name: "ExternalEstimatedArrivalAt",
                table: "Shipments");

            migrationBuilder.DropColumn(
                name: "ExternalLastSyncedAt",
                table: "Shipments");

            migrationBuilder.DropColumn(
                name: "ExternalOrigin",
                table: "Shipments");

            migrationBuilder.DropColumn(
                name: "ExternalStatus",
                table: "Shipments");

            migrationBuilder.DropColumn(
                name: "ExternalTrackingCode",
                table: "Shipments");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ExternalCarrierName",
                table: "Shipments",
                type: "varchar(200)",
                maxLength: 200,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "ExternalDestination",
                table: "Shipments",
                type: "varchar(200)",
                maxLength: 200,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "ExternalEstimatedArrivalAt",
                table: "Shipments",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ExternalLastSyncedAt",
                table: "Shipments",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ExternalOrigin",
                table: "Shipments",
                type: "varchar(200)",
                maxLength: 200,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "ExternalStatus",
                table: "Shipments",
                type: "varchar(200)",
                maxLength: 200,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "ExternalTrackingCode",
                table: "Shipments",
                type: "varchar(200)",
                maxLength: 200,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");
        }
    }
}
