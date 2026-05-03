using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ShippingPlatform.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCurrencyForeignKeys : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Defensive: ensure the seeded base currencies exist before adding the FK,
            // in case this migration runs before the post-Migrate seed pass on a fresh DB
            // that already has Packages with Currency='EUR' from earlier seed data.
            migrationBuilder.Sql(@"
                INSERT IGNORE INTO Currencies (Code, Name, Symbol, IsBase, AnchorCurrencyCode, Rate, IsActive, UpdatedAt)
                VALUES
                  ('USD','US Dollar','$',1,NULL,NULL,1,UTC_TIMESTAMP()),
                  ('EUR','Euro','€',0,'USD',1.075,1,UTC_TIMESTAMP()),
                  ('XAF','Central African CFA Franc','FCFA',0,'EUR',0.001524,1,UTC_TIMESTAMP());
            ");

            migrationBuilder.AddUniqueConstraint(
                name: "AK_Currencies_Code",
                table: "Currencies",
                column: "Code");

            migrationBuilder.CreateIndex(
                name: "IX_PricingConfigs_Currency",
                table: "PricingConfigs",
                column: "Currency");

            migrationBuilder.CreateIndex(
                name: "IX_Packages_Currency",
                table: "Packages",
                column: "Currency");

            migrationBuilder.AddForeignKey(
                name: "FK_Packages_Currencies_Currency",
                table: "Packages",
                column: "Currency",
                principalTable: "Currencies",
                principalColumn: "Code",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_PricingConfigs_Currencies_Currency",
                table: "PricingConfigs",
                column: "Currency",
                principalTable: "Currencies",
                principalColumn: "Code",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Packages_Currencies_Currency",
                table: "Packages");

            migrationBuilder.DropForeignKey(
                name: "FK_PricingConfigs_Currencies_Currency",
                table: "PricingConfigs");

            migrationBuilder.DropIndex(
                name: "IX_PricingConfigs_Currency",
                table: "PricingConfigs");

            migrationBuilder.DropIndex(
                name: "IX_Packages_Currency",
                table: "Packages");

            migrationBuilder.DropUniqueConstraint(
                name: "AK_Currencies_Code",
                table: "Currencies");
        }
    }
}
