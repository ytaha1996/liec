using Microsoft.EntityFrameworkCore;
using ShippingPlatform.Api.Models;

namespace ShippingPlatform.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<AdminUser> AdminUsers => Set<AdminUser>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<WhatsAppConsent> WhatsAppConsents => Set<WhatsAppConsent>();
    public DbSet<Warehouse> Warehouses => Set<Warehouse>();
    public DbSet<PricingConfig> PricingConfigs => Set<PricingConfig>();
    public DbSet<GoodType> GoodTypes => Set<GoodType>();
    public DbSet<Good> Goods => Set<Good>();
    public DbSet<Shipment> Shipments => Set<Shipment>();
    public DbSet<ShipmentSequence> ShipmentSequences => Set<ShipmentSequence>();
    public DbSet<Package> Packages => Set<Package>();
    public DbSet<PackageItem> PackageItems => Set<PackageItem>();
    public DbSet<Supplier> Suppliers => Set<Supplier>();
    public DbSet<SupplyOrder> SupplyOrders => Set<SupplyOrder>();
    public DbSet<Media> Media => Set<Media>();
    public DbSet<WhatsAppCampaign> WhatsAppCampaigns => Set<WhatsAppCampaign>();
    public DbSet<WhatsAppDeliveryLog> WhatsAppDeliveryLogs => Set<WhatsAppDeliveryLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Customer>().HasIndex(x => x.CustomerRef).IsUnique();
        modelBuilder.Entity<Customer>().HasOne(x => x.WhatsAppConsent).WithOne(x => x.Customer).HasForeignKey<WhatsAppConsent>(x => x.CustomerId);
        modelBuilder.Entity<Warehouse>().HasIndex(x => x.Code).IsUnique();
        modelBuilder.Entity<SupplyOrder>().HasIndex(x => x.PackageId).IsUnique();
        modelBuilder.Entity<ShipmentSequence>().HasIndex(x => new { x.OriginWarehouseCode, x.Year }).IsUnique();
    }
}
