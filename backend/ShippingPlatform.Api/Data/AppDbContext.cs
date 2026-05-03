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
    public DbSet<Shipment> Shipments => Set<Shipment>();
    public DbSet<ShipmentSequence> ShipmentSequences => Set<ShipmentSequence>();
    public DbSet<InvoiceSequence> InvoiceSequences => Set<InvoiceSequence>();
    public DbSet<Currency> Currencies => Set<Currency>();
    public DbSet<ShipmentRateSnapshot> ShipmentRateSnapshots => Set<ShipmentRateSnapshot>();
    public DbSet<Package> Packages => Set<Package>();
    public DbSet<PackageItem> PackageItems => Set<PackageItem>();
    public DbSet<Supplier> Suppliers => Set<Supplier>();
    public DbSet<SupplyOrder> SupplyOrders => Set<SupplyOrder>();
    public DbSet<Media> Media => Set<Media>();
    public DbSet<WhatsAppCampaign> WhatsAppCampaigns => Set<WhatsAppCampaign>();
    public DbSet<WhatsAppDeliveryLog> WhatsAppDeliveryLogs => Set<WhatsAppDeliveryLog>();
    public DbSet<PackagePricingOverride> PricingOverrides => Set<PackagePricingOverride>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Customer>().HasOne(x => x.WhatsAppConsent).WithOne(x => x.Customer).HasForeignKey<WhatsAppConsent>(x => x.CustomerId);
        modelBuilder.Entity<Warehouse>().HasIndex(x => x.Code).IsUnique();
        modelBuilder.Entity<Shipment>().HasIndex(x => x.RefCode).IsUnique();
        modelBuilder.Entity<SupplyOrder>().HasIndex(x => x.PackageId).IsUnique();
        modelBuilder.Entity<ShipmentSequence>().HasIndex(x => new { x.OriginWarehouseCode, x.Year }).IsUnique();
        modelBuilder.Entity<InvoiceSequence>().HasIndex(x => x.Year).IsUnique();
        modelBuilder.Entity<Currency>().HasIndex(x => x.Code).IsUnique();
        modelBuilder.Entity<Currency>().Property(x => x.Rate).HasPrecision(18, 8);
        modelBuilder.Entity<ShipmentRateSnapshot>().HasIndex(x => new { x.ShipmentId, x.Event, x.CurrencyCode }).IsUnique();
        modelBuilder.Entity<ShipmentRateSnapshot>().Property(x => x.RateToBase).HasPrecision(18, 8);
        modelBuilder.Entity<ShipmentRateSnapshot>()
            .HasOne(x => x.Shipment).WithMany()
            .HasForeignKey(x => x.ShipmentId)
            .OnDelete(DeleteBehavior.Cascade);

        // Performance indexes on foreign keys used in frequent queries
        modelBuilder.Entity<Package>().HasIndex(x => x.ShipmentId);
        modelBuilder.Entity<Package>().HasIndex(x => x.CustomerId);
        modelBuilder.Entity<PackageItem>().HasIndex(x => x.PackageId);
        modelBuilder.Entity<PackageItem>().Property(x => x.Unit).HasDefaultValue(Unit.Box).IsRequired();
        modelBuilder.Entity<PackageItem>().Property(x => x.UnitPrice).HasPrecision(18, 2);
        modelBuilder.Entity<Media>().HasIndex(x => x.PackageId);
        modelBuilder.Entity<WhatsAppDeliveryLog>().HasIndex(x => x.CampaignId);
        modelBuilder.Entity<PackagePricingOverride>().HasIndex(x => x.PackageId);
        modelBuilder.Entity<AuditLog>().HasIndex(x => new { x.EntityType, x.EntityId });

        // ── Decimal precision (Task 6.1) ──
        modelBuilder.Entity<Package>().Property(x => x.WeightKg).HasPrecision(10, 3);
        modelBuilder.Entity<Package>().Property(x => x.Cbm).HasPrecision(10, 3);
        modelBuilder.Entity<Package>().Property(x => x.AppliedRatePerKg).HasPrecision(12, 4);
        modelBuilder.Entity<Package>().Property(x => x.AppliedRatePerCbm).HasPrecision(12, 4);
        modelBuilder.Entity<Package>().Property(x => x.ChargeAmount).HasPrecision(18, 2);
        modelBuilder.Entity<Shipment>().Property(x => x.MaxWeightKg).HasPrecision(10, 3);
        modelBuilder.Entity<Shipment>().Property(x => x.MaxCbm).HasPrecision(10, 3);
        modelBuilder.Entity<Shipment>().Property(x => x.TotalWeightKg).HasPrecision(10, 3);
        modelBuilder.Entity<Shipment>().Property(x => x.TotalCbm).HasPrecision(10, 3);
        modelBuilder.Entity<Warehouse>().Property(x => x.MaxWeightKg).HasPrecision(10, 3);
        modelBuilder.Entity<Warehouse>().Property(x => x.MaxCbm).HasPrecision(10, 3);
        modelBuilder.Entity<PricingConfig>().Property(x => x.DefaultRatePerKg).HasPrecision(12, 4);
        modelBuilder.Entity<PricingConfig>().Property(x => x.DefaultRatePerCbm).HasPrecision(12, 4);
        modelBuilder.Entity<PricingConfig>().Property(x => x.MinimumCharge).HasPrecision(12, 4);
        modelBuilder.Entity<PackagePricingOverride>().Property(x => x.OriginalValue).HasPrecision(18, 2);
        modelBuilder.Entity<PackagePricingOverride>().Property(x => x.NewValue).HasPrecision(18, 2);
        modelBuilder.Entity<SupplyOrder>().Property(x => x.PurchasePrice).HasPrecision(18, 2);

        // ── Performance indexes (Task 6.3) ──
        modelBuilder.Entity<AdminUser>().HasIndex(x => x.Email).IsUnique();
        modelBuilder.Entity<Customer>().HasIndex(x => x.Email);
        modelBuilder.Entity<Customer>().HasIndex(x => x.PrimaryPhone).IsUnique();
        modelBuilder.Entity<Package>().HasIndex(x => x.Status);
        modelBuilder.Entity<Package>().HasIndex(x => x.SupplyOrderId);
        modelBuilder.Entity<Shipment>().HasIndex(x => x.Status);
        modelBuilder.Entity<Shipment>().HasIndex(x => x.PlannedDepartureDate);
        modelBuilder.Entity<WhatsAppDeliveryLog>().HasIndex(x => x.CustomerId);
        modelBuilder.Entity<WhatsAppDeliveryLog>().HasIndex(x => x.Result);
        modelBuilder.Entity<AuditLog>().HasIndex(x => x.AdminUserId);
        modelBuilder.Entity<AuditLog>().HasIndex(x => x.CreatedAt);

        // ── Restrict cascade-delete on parents (Task 6.4) ──
        modelBuilder.Entity<Shipment>()
            .HasOne(x => x.OriginWarehouse).WithMany()
            .HasForeignKey(x => x.OriginWarehouseId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Shipment>()
            .HasOne(x => x.DestinationWarehouse).WithMany()
            .HasForeignKey(x => x.DestinationWarehouseId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Package>()
            .HasOne(x => x.Customer).WithMany()
            .HasForeignKey(x => x.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Package>()
            .HasOne(x => x.Shipment).WithMany(s => s.Packages)
            .HasForeignKey(x => x.ShipmentId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<SupplyOrder>()
            .HasOne(x => x.Customer).WithMany()
            .HasForeignKey(x => x.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<SupplyOrder>()
            .HasOne(x => x.Supplier).WithMany()
            .HasForeignKey(x => x.SupplierId)
            .OnDelete(DeleteBehavior.Restrict);

        // Media → AdminUser (uploader). Restrict so deleted users don't blow away media history.
        modelBuilder.Entity<Media>()
            .HasOne(x => x.RecordedByAdminUser).WithMany()
            .HasForeignKey(x => x.RecordedByAdminUserId)
            .OnDelete(DeleteBehavior.Restrict);

        // Package.Currency / PricingConfig.Currency → Currencies.Code (alternate key).
        // Currency rows can't be deleted while referenced — see CurrencyBusiness.DeleteAsync.
        modelBuilder.Entity<Currency>().HasAlternateKey(c => c.Code);
        modelBuilder.Entity<Package>()
            .HasOne(p => p.CurrencyEntity).WithMany()
            .HasForeignKey(p => p.Currency)
            .HasPrincipalKey(c => c.Code)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<PricingConfig>()
            .HasOne(p => p.CurrencyEntity).WithMany()
            .HasForeignKey(p => p.Currency)
            .HasPrincipalKey(c => c.Code)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
