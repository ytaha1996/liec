using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ShippingPlatform.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddMediaRecordedByForeignKey : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<int>(
                name: "RecordedByAdminUserId",
                table: "Media",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.CreateIndex(
                name: "IX_Media_RecordedByAdminUserId",
                table: "Media",
                column: "RecordedByAdminUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Media_AdminUsers_RecordedByAdminUserId",
                table: "Media",
                column: "RecordedByAdminUserId",
                principalTable: "AdminUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Media_AdminUsers_RecordedByAdminUserId",
                table: "Media");

            migrationBuilder.DropIndex(
                name: "IX_Media_RecordedByAdminUserId",
                table: "Media");

            migrationBuilder.AlterColumn<int>(
                name: "RecordedByAdminUserId",
                table: "Media",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);
        }
    }
}
