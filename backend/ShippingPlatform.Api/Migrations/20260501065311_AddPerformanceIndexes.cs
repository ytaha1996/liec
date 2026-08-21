using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ShippingPlatform.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPerformanceIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_WhatsAppDeliveryLogs_CustomerId",
                table: "WhatsAppDeliveryLogs",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_WhatsAppDeliveryLogs_Result",
                table: "WhatsAppDeliveryLogs",
                column: "Result");

            migrationBuilder.CreateIndex(
                name: "IX_Shipments_PlannedDepartureDate",
                table: "Shipments",
                column: "PlannedDepartureDate");

            migrationBuilder.CreateIndex(
                name: "IX_Shipments_Status",
                table: "Shipments",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_Packages_Status",
                table: "Packages",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_Packages_SupplyOrderId",
                table: "Packages",
                column: "SupplyOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_Customers_Email",
                table: "Customers",
                column: "Email");

            migrationBuilder.CreateIndex(
                name: "IX_Customers_PrimaryPhone",
                table: "Customers",
                column: "PrimaryPhone");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_AdminUserId",
                table: "AuditLogs",
                column: "AdminUserId");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_CreatedAt",
                table: "AuditLogs",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_AdminUsers_Email",
                table: "AdminUsers",
                column: "Email",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_WhatsAppDeliveryLogs_CustomerId",
                table: "WhatsAppDeliveryLogs");

            migrationBuilder.DropIndex(
                name: "IX_WhatsAppDeliveryLogs_Result",
                table: "WhatsAppDeliveryLogs");

            migrationBuilder.DropIndex(
                name: "IX_Shipments_PlannedDepartureDate",
                table: "Shipments");

            migrationBuilder.DropIndex(
                name: "IX_Shipments_Status",
                table: "Shipments");

            migrationBuilder.DropIndex(
                name: "IX_Packages_Status",
                table: "Packages");

            migrationBuilder.DropIndex(
                name: "IX_Packages_SupplyOrderId",
                table: "Packages");

            migrationBuilder.DropIndex(
                name: "IX_Customers_Email",
                table: "Customers");

            migrationBuilder.DropIndex(
                name: "IX_Customers_PrimaryPhone",
                table: "Customers");

            migrationBuilder.DropIndex(
                name: "IX_AuditLogs_AdminUserId",
                table: "AuditLogs");

            migrationBuilder.DropIndex(
                name: "IX_AuditLogs_CreatedAt",
                table: "AuditLogs");

            migrationBuilder.DropIndex(
                name: "IX_AdminUsers_Email",
                table: "AdminUsers");
        }
    }
}
