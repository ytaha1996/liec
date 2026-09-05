using ShippingPlatform.Api.Models;
using ShippingPlatform.Api.Services;

namespace ShippingPlatform.Api.Tests;

/// <summary>
/// The state machines. These decide what staff are allowed to do with real
/// cargo, and they were previously only exercised through the browser.
/// </summary>
public class TransitionRuleTests
{
    private readonly TransitionRuleService _rules = new();

    [Theory]
    [InlineData(ShipmentStatus.Draft, ShipmentStatus.Scheduled)]
    [InlineData(ShipmentStatus.Scheduled, ShipmentStatus.ReadyToDepart)]
    [InlineData(ShipmentStatus.ReadyToDepart, ShipmentStatus.Departed)]
    [InlineData(ShipmentStatus.Departed, ShipmentStatus.Arrived)]
    [InlineData(ShipmentStatus.Arrived, ShipmentStatus.Closed)]
    public void Shipments_move_forward_one_stage_at_a_time(ShipmentStatus from, ShipmentStatus to)
        => Assert.True(_rules.CanMove(from, to));

    [Theory]
    [InlineData(ShipmentStatus.Draft)]
    [InlineData(ShipmentStatus.Scheduled)]
    [InlineData(ShipmentStatus.ReadyToDepart)]
    public void A_shipment_can_be_cancelled_before_it_departs(ShipmentStatus from)
        => Assert.True(_rules.CanMove(from, ShipmentStatus.Cancelled));

    [Theory]
    [InlineData(ShipmentStatus.Departed)]
    [InlineData(ShipmentStatus.Arrived)]
    [InlineData(ShipmentStatus.Closed)]
    public void A_shipment_cannot_be_cancelled_once_it_has_sailed(ShipmentStatus from)
        => Assert.False(_rules.CanMove(from, ShipmentStatus.Cancelled));

    [Theory]
    [InlineData(ShipmentStatus.Draft, ShipmentStatus.Departed)]   // skipping stages
    [InlineData(ShipmentStatus.Departed, ShipmentStatus.Scheduled)] // going backwards
    [InlineData(ShipmentStatus.Closed, ShipmentStatus.Arrived)]
    [InlineData(ShipmentStatus.Cancelled, ShipmentStatus.Draft)]
    public void Shipments_cannot_skip_stages_or_reverse(ShipmentStatus from, ShipmentStatus to)
        => Assert.False(_rules.CanMove(from, to));

    [Theory]
    [InlineData(PackageStatus.Draft, PackageStatus.Received)]
    [InlineData(PackageStatus.Received, PackageStatus.Packed)]
    [InlineData(PackageStatus.Packed, PackageStatus.ReadyToShip)]
    [InlineData(PackageStatus.ReadyToShip, PackageStatus.Shipped)]
    [InlineData(PackageStatus.Shipped, PackageStatus.ArrivedAtDestination)]
    [InlineData(PackageStatus.ArrivedAtDestination, PackageStatus.ReadyForHandout)]
    [InlineData(PackageStatus.ReadyForHandout, PackageStatus.HandedOut)]
    public void Packages_move_forward_one_stage_at_a_time(PackageStatus from, PackageStatus to)
        => Assert.True(_rules.CanMove(from, to));

    [Theory]
    [InlineData(PackageStatus.Draft)]
    [InlineData(PackageStatus.Received)]
    [InlineData(PackageStatus.Packed)]
    [InlineData(PackageStatus.ReadyToShip)]
    public void A_package_can_be_cancelled_before_it_ships(PackageStatus from)
        => Assert.True(_rules.CanMove(from, PackageStatus.Cancelled));

    [Theory]
    [InlineData(PackageStatus.Shipped)]
    [InlineData(PackageStatus.ArrivedAtDestination)]
    [InlineData(PackageStatus.HandedOut)]
    public void A_package_cannot_be_cancelled_once_it_has_shipped(PackageStatus from)
        => Assert.False(_rules.CanMove(from, PackageStatus.Cancelled));

    [Theory]
    [InlineData(PackageStatus.Draft, PackageStatus.Shipped)]
    [InlineData(PackageStatus.HandedOut, PackageStatus.Packed)]
    [InlineData(PackageStatus.Shipped, PackageStatus.Packed)]
    public void Packages_cannot_skip_stages_or_reverse(PackageStatus from, PackageStatus to)
        => Assert.False(_rules.CanMove(from, to));

    [Fact]
    public void Cancelling_a_supply_order_demands_a_reason()
    {
        var allowed = _rules.CanMove(SupplyOrderStatus.Approved, SupplyOrderStatus.Cancelled, null, out var message);

        Assert.False(allowed);
        Assert.NotNull(message);
    }

    [Fact]
    public void A_supply_order_cancels_with_a_reason()
        => Assert.True(_rules.CanMove(SupplyOrderStatus.Approved, SupplyOrderStatus.Cancelled, "supplier withdrew", out _));
}
