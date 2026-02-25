using FluentValidation.AspNetCore;
using Microsoft.EntityFrameworkCore;
using ShippingPlatform.Api.Data;
using ShippingPlatform.Api.Models;
using ShippingPlatform.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddFluentValidationAutoValidation();

var conn = builder.Configuration["ConnectionStrings:MySql"]
          ?? builder.Configuration.GetConnectionString("MySql")
          ?? builder.Configuration.GetConnectionString("Default")
          ?? builder.Configuration["ConnectionStrings:Default"];
if (!string.IsNullOrWhiteSpace(conn))
    builder.Services.AddDbContext<AppDbContext>(o => o.UseMySql(conn, ServerVersion.AutoDetect(conn)));
else
    builder.Services.AddDbContext<AppDbContext>(o => o.UseInMemoryDatabase("shipping"));

builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IBlobStorageService, BlobStorageService>();
builder.Services.AddScoped<IRefCodeService, RefCodeService>();
builder.Services.AddScoped<IPricingService, PricingService>();
builder.Services.AddScoped<IPhotoComplianceService, PhotoComplianceService>();
builder.Services.AddScoped<IWhatsAppSender, StubWhatsAppSender>();
builder.Services.AddScoped<IExportService, ExportService>();

var app = builder.Build();
if (app.Environment.IsDevelopment()) { app.UseSwagger(); app.UseSwaggerUI(); }

app.Use(async (ctx, next) =>
{
    var anon = ctx.Request.Path.StartsWithSegments("/api/auth/login") || ctx.Request.Path.StartsWithSegments("/swagger");
    if (anon) { await next(); return; }
    if (!ctx.Request.Headers.TryGetValue("Authorization", out var h) || !h.ToString().StartsWith("Bearer "))
    {
        ctx.Response.StatusCode = 401;
        await ctx.Response.WriteAsJsonAsync(new { code = "UNAUTHORIZED", message = "Missing Bearer token." });
        return;
    }
    await next();
});
app.MapControllers();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
    var email = app.Configuration["SeedAdmin:Email"] ?? Environment.GetEnvironmentVariable("ADMIN_EMAIL") ?? Environment.GetEnvironmentVariable("SEED_ADMIN_EMAIL") ?? "admin@local";
    var pwd = app.Configuration["SeedAdmin:Password"] ?? Environment.GetEnvironmentVariable("ADMIN_PASSWORD") ?? Environment.GetEnvironmentVariable("SEED_ADMIN_PASSWORD") ?? "Admin123!";
    if (!db.AdminUsers.Any(x => x.Email == email))
        db.AdminUsers.Add(new AdminUser { Email = email, PasswordHash = BCrypt.Net.BCrypt.HashPassword(pwd), IsActive = true });
    db.SaveChanges();
}

app.Run();
