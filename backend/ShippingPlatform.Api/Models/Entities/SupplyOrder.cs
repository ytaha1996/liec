using System.ComponentModel.DataAnnotations;

namespace ShippingPlatform.Api.Models;

public class SupplyOrder
{
    public int Id { get; set; }
    public int CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;
    public int SupplierId { get; set; }
    public Supplier Supplier { get; set; } = null!;
    public int? PackageId { get; set; }
    [MaxLength(200)] public string Name { get; set; } = string.Empty;
    public decimal PurchasePrice { get; set; }
    [MaxLength(2000)] public string? Details { get; set; }
    public SupplyOrderStatus Status { get; set; } = SupplyOrderStatus.Draft;
    [MaxLength(500)] public string? CancelReason { get; set; }
}
