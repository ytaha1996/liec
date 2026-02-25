using System.Text;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using ShippingPlatform.Api.Data;
using ShippingPlatform.Api.Models;
using ShippingPlatform.Api.Services;
using ShippingPlatform.Api.Business;

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

var secret = builder.Configuration["Auth:Secret"] ?? "dev-secret-super-long";
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)),
            ClockSkew = TimeSpan.FromMinutes(1)
        };
    });
builder.Services.AddAuthorization();

builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IBlobStorageService, BlobStorageService>();
builder.Services.AddScoped<IRefCodeService, RefCodeService>();
builder.Services.AddScoped<IPricingService, PricingService>();
builder.Services.AddScoped<IPhotoComplianceService, PhotoComplianceService>();
builder.Services.AddScoped<IWhatsAppSender, StubWhatsAppSender>();
builder.Services.AddScoped<IExportService, ExportService>();
builder.Services.AddScoped<ITransitionRuleService, TransitionRuleService>();
builder.Services.AddScoped<IAuthBusiness, AuthBusiness>();
builder.Services.AddScoped<IMasterDataBusiness, MasterDataBusiness>();
builder.Services.AddScoped<ICustomerBusiness, CustomerBusiness>();
builder.Services.AddScoped<IShipmentBusiness, ShipmentBusiness>();
builder.Services.AddScoped<IPackageBusiness, PackageBusiness>();
builder.Services.AddScoped<ISupplyOrderBusiness, SupplyOrderBusiness>();
builder.Services.AddScoped<IWhatsAppBusiness, WhatsAppBusiness>();
builder.Services.AddScoped<IExportBusiness, ExportBusiness>();

var app = builder.Build();
if (app.Environment.IsDevelopment()) { app.UseSwagger(); app.UseSwaggerUI(); }

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers().RequireAuthorization();

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
