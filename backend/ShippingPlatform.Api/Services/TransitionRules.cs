using ShippingPlatform.Api.Models;

namespace ShippingPlatform.Api.Services;

public interface ITransitionRuleService
{
    bool CanMove(ShipmentStatus from, ShipmentStatus to);
    bool CanMove(PackageStatus from, PackageStatus to);
    bool CanMove(SupplyOrderStatus from, SupplyOrderStatus to, string? cancelReason, out string? message);
}

public class TransitionRuleService : ITransitionRuleService
{
    public bool CanMove(ShipmentStatus from, ShipmentStatus to)
    {
        if (from == to) return true;
        return (from, to) switch
        {
            (ShipmentStatus.Draft, ShipmentStatus.Pending) => true,
            (ShipmentStatus.Pending, ShipmentStatus.Loaded) => true,
            (ShipmentStatus.NearlyFull, ShipmentStatus.Loaded) => true,
            (ShipmentStatus.Loaded, ShipmentStatus.Shipped) => true,
            (ShipmentStatus.Shipped, ShipmentStatus.Arrived) => true,
            (ShipmentStatus.Arrived, ShipmentStatus.Completed) => true,
            (ShipmentStatus.Completed, ShipmentStatus.Closed) => true,
            (ShipmentStatus.Draft, ShipmentStatus.Cancelled) => true,
            (ShipmentStatus.Pending, ShipmentStatus.Cancelled) => true,
            (ShipmentStatus.NearlyFull, ShipmentStatus.Cancelled) => true,
            _ => false
        };
    }

    public bool CanMove(PackageStatus from, PackageStatus to)
    {
        if (from == to) return true;
        return (from, to) switch
        {
            (PackageStatus.Draft, PackageStatus.Received) => true,
            (PackageStatus.Received, PackageStatus.Packed) => true,
            (PackageStatus.Packed, PackageStatus.ReadyToShip) => true,
            (PackageStatus.ReadyToShip, PackageStatus.Shipped) => true,
            (PackageStatus.Shipped, PackageStatus.ArrivedAtDestination) => true,
            (PackageStatus.ArrivedAtDestination, PackageStatus.ReadyForHandout) => true,
            (PackageStatus.ReadyForHandout, PackageStatus.HandedOut) => true,
            (PackageStatus.Draft, PackageStatus.Cancelled) => true,
            (PackageStatus.Received, PackageStatus.Cancelled) => true,
            (PackageStatus.Packed, PackageStatus.Cancelled) => true,
            (PackageStatus.ReadyToShip, PackageStatus.Cancelled) => true,
            _ => false
        };
    }

    public bool CanMove(SupplyOrderStatus from, SupplyOrderStatus to, string? cancelReason, out string? message)
    {
        message = null;
        if (to == SupplyOrderStatus.Cancelled && string.IsNullOrWhiteSpace(cancelReason))
        {
            message = "Cancel reason is required.";
            return false;
        }

        if (from == to) return true;
        var ok = (from, to) switch
        {
            (SupplyOrderStatus.Draft, SupplyOrderStatus.Approved) => true,
            (SupplyOrderStatus.Approved, SupplyOrderStatus.Ordered) => true,
            (SupplyOrderStatus.Ordered, SupplyOrderStatus.DeliveredToWarehouse) => true,
            (SupplyOrderStatus.DeliveredToWarehouse, SupplyOrderStatus.PackedIntoPackage) => true,
            (SupplyOrderStatus.PackedIntoPackage, SupplyOrderStatus.Closed) => true,
            (_, SupplyOrderStatus.Cancelled) => true,
            _ => false
        };
        if (!ok) message = $"Invalid transition from {from} to {to}.";
        return ok;
    }
}
