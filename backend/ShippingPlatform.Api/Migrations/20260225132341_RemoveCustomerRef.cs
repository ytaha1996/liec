using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ShippingPlatform.Api.Migrations
{
    /// <inheritdoc />
    public partial class RemoveCustomerRef : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Customers_CustomerRef",
                table: "Customers");

            migrationBuilder.DropColumn(
                name: "CustomerRef",
                table: "Customers");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CustomerRef",
                table: "Customers",
                type: "varchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_Customers_CustomerRef",
                table: "Customers",
                column: "CustomerRef",
                unique: true);
        }
    }
}
