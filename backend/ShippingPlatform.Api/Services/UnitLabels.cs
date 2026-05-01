using ShippingPlatform.Api.Models;

namespace ShippingPlatform.Api.Services;

public static class UnitLabels
{
    public static readonly IReadOnlyDictionary<Unit, string> En = new Dictionary<Unit, string>
    {
        [Unit.Box]    = "Box",
        [Unit.Piece]  = "Piece",
        [Unit.Crt]    = "Carton",
        [Unit.Bag]    = "Bag",
        [Unit.Pallet] = "Pallet",
    };

    public static readonly IReadOnlyDictionary<Unit, string> Ar = new Dictionary<Unit, string>
    {
        [Unit.Box]    = "صندوق",
        [Unit.Piece]  = "قطعة",
        [Unit.Crt]    = "كرتونة",
        [Unit.Bag]    = "كيس",
        [Unit.Pallet] = "منصة",
    };

    public static readonly IReadOnlyDictionary<Unit, string> ExcelCode = new Dictionary<Unit, string>
    {
        [Unit.Box]    = "BOX",
        [Unit.Piece]  = "PC",
        [Unit.Crt]    = "CRT",
        [Unit.Bag]    = "BAG",
        [Unit.Pallet] = "PALLET",
    };
}
