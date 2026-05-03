using ClosedXML.Excel;
using ShippingPlatform.Api.Models;

namespace ShippingPlatform.Api.Services.Exports;

/// <summary>
/// Builds the two-sheet Commercial Invoice + Packing List workbook for a shipment.
/// Layout follows the legacy "925_FINAL_INVOICE___PL_GAB.xlsx" template byte-for-byte:
/// - exact column widths
/// - exact (mis)spellings (e.g., FRIEGHT)
/// - exact leading/trailing spaces in sheet names and labels
/// </summary>
public record InvoiceFxRates(
    decimal EurPerBase,        // for "Total / EurPerBase = EUR" footer (1.075)
    decimal F8DisplayRate,     // value written into F8 cell (and used in =E*$F$8 formula)
    decimal CountryPerEur);    // for "*676" multiplier in column H

public static class CommercialDocumentBuilder
{
    public static void Fill(
        IXLWorkbook workbook,
        Shipment shipment,
        int invoiceNumber,
        int invoiceYear,
        InvoiceTemplateConstants tpl,
        InvoiceFxRates rates)
    {
        var packages = shipment.Packages
            .Where(p => p.Status != PackageStatus.Cancelled)
            .OrderBy(p => p.Id)
            .ToList();

        var distinctCustomers = packages.Select(p => p.Customer).DistinctBy(c => c.Id).ToList();
        var primaryCustomer = packages.OrderBy(p => p.Id).Select(p => p.Customer).FirstOrDefault()
            ?? throw new InvalidOperationException("Shipment has no active packages.");
        var multi = distinctCustomers.Count > 1;

        var dest = shipment.DestinationWarehouse;
        var refCode = shipment.RefCode;
        var country2 = CountryCodeHelper.FromWarehouseCountry(dest.Country);
        var destCity = (dest.City ?? string.Empty).ToUpperInvariant();
        var invoiceDate = shipment.PlannedDepartureDate == default
            ? DateTime.UtcNow.Date
            : shipment.PlannedDepartureDate;

        var invoiceSheetName = $" {refCode} Invoice {country2} ";
        var plSheetName = $" {refCode} PL {country2}";

        FillInvoiceSheet(workbook.Worksheets.Add(SafeSheet(invoiceSheetName)),
            shipment, packages, primaryCustomer, multi, invoiceNumber, invoiceYear,
            invoiceDate, country2, destCity, tpl, rates);
        FillPackingListSheet(workbook.Worksheets.Add(SafeSheet(plSheetName)),
            shipment, packages, primaryCustomer, multi, invoiceNumber, invoiceYear,
            invoiceDate, country2);
    }

    // Excel sheet names are limited to 31 chars and exclude :\\/?*[].
    private static string SafeSheet(string name)
    {
        var invalid = new[] { ':', '\\', '/', '?', '*', '[', ']' };
        var clean = new string(name.Select(c => invalid.Contains(c) ? '-' : c).ToArray());
        return clean.Length <= 31 ? clean : clean[..31];
    }

    private static void FillInvoiceSheet(
        IXLWorksheet ws,
        Shipment shipment,
        List<Package> packages,
        Customer primaryCustomer,
        bool multi,
        int invoiceNumber,
        int invoiceYear,
        DateTime invoiceDate,
        string country2,
        string destCity,
        InvoiceTemplateConstants tpl,
        InvoiceFxRates rates)
    {
        // Column widths (preserve exactly from source).
        ws.Column("A").Width = 54.54;
        ws.Column("B").Width = 8.82;
        ws.Column("C").Width = 12.73;
        ws.Column("D").Width = 11.36;
        ws.Column("E").Width = 8.91;
        ws.Column("F").Width = 10.82;
        ws.Column("G").Width = 17.18;
        ws.Column("H").Width = 11.82;

        // ── Header rows 1-4 ──
        ws.Range("A1:E1").Merge().Value = tpl.CompanyName;
        var r1 = ws.Row(1); r1.Height = 40;
        var c1 = ws.Range("A1:E1").Style;
        c1.Font.FontName = "Algerian"; c1.Font.FontSize = 28; c1.Font.Bold = true;
        c1.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

        ws.Range("A2:E2").Merge().Value = tpl.CompanyTagline;
        ws.Row(2).Height = 12.5;
        var c2 = ws.Range("A2:E2").Style;
        c2.Font.FontName = "Century Gothic"; c2.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

        ws.Range("A3:E3").Merge().Value = tpl.CompanyEstablished;
        ws.Row(3).Height = 12.5;
        var c3 = ws.Range("A3:E3").Style;
        c3.Font.FontName = "Century Gothic"; c3.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

        ws.Range("A4:E4").Merge().Value = "COMMERCIAL INVOICE";
        ws.Row(4).Height = 17.5;
        var c4 = ws.Range("A4:E4").Style;
        c4.Font.FontName = "Century Gothic"; c4.Font.FontSize = 14; c4.Font.Bold = true;
        c4.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

        ws.Row(5).Height = 6;

        // ── Header rows 6-9 (client / shipment metadata) ──
        ws.Cell("A6").Value = $"To Client: {primaryCustomer.Name}";
        ws.Cell("C6").Value = "Date       ";
        ws.Cell("D6").Value = $" :  {invoiceDate:dd / MM / yyyy}";

        ws.Cell("A7").Value = $"Street Address: {primaryCustomer.BillingAddress ?? string.Empty}";
        ws.Cell("C7").Value = "Invoice #";
        ws.Cell("D7").Value = $":  No. {invoiceNumber} -{invoiceYear}";
        ws.Cell("F7").Value = $"Taux {rates.CountryPerEur:0}";

        var countryPrefix = string.IsNullOrEmpty(country2) ? "" : country2 + " / ";
        ws.Cell("A8").Value = $"{countryPrefix}TEL: {primaryCustomer.PrimaryPhone}";
        ws.Cell("C8").Value = "Customer ID ";
        ws.Cell("D8").Value = $": {country2}{primaryCustomer.Id} \\\\  {shipment.RefCode}";
        ws.Cell("F8").Value = rates.F8DisplayRate;
        // Document the source of the rate for ops who reference the legacy template (which had a
        // hardcoded 1.3496503 in F8). Now sourced from the shipment's Departed FX snapshot, with
        // live-rate fallback if the shipment hasn't departed.
        ws.Cell("F8").CreateComment().AddText("USD-per-EUR rate from the Departed FX snapshot (or live rate if not yet departed). Replaces the legacy hardcoded 1.3496503.");

        ws.Cell("A9").Value = $"CONTAINER : {shipment.TiiuCode ?? string.Empty}";

        var headerStyle = ws.Range("A6:F9").Style;
        headerStyle.Font.FontName = "Century Gothic";
        headerStyle.Font.FontSize = 12;
        headerStyle.Font.Bold = true;

        ws.Row(10).Height = 6.75;

        // ── Items table column-letter map ──
        // Single-customer (matches original sample exactly):
        //   A=Description, B=QTY, C=Unit, D=Unit Price, E=Total, F=C, G=POSITION, H=H formula
        // Multi-customer (Customer column inserted at A; everything shifts right):
        //   A=Customer, B=Description, C=QTY, D=Unit, E=Unit Price, F=Total, G=C, H=POSITION, I=H formula
        var col = multi
            ? new ItemColumns("A", "B", "C", "D", "E", "F", "G", "H", "I")
            : new ItemColumns(null, "A", "B", "C", "D", "E", "F", "G", "H");

        // ── Row 11 — items table headers ──
        var headerRow = 11;
        if (multi) ws.Cell($"{col.Customer}{headerRow}").Value = "Customer";
        ws.Cell($"{col.Description}{headerRow}").Value = "Description";
        ws.Cell($"{col.Qty}{headerRow}").Value = "QTY";
        ws.Cell($"{col.Unit}{headerRow}").Value = "Unit";
        ws.Cell($"{col.UnitPrice}{headerRow}").Value = "Unit Price";
        ws.Cell($"{col.Total}{headerRow}").Value = "Total";
        ws.Cell($"{col.C}{headerRow}").Value = "C";
        ws.Cell($"{col.PositionTariff}{headerRow}").Value = "POSITION TARRIFAIRE ";

        var headerRange = ws.Range($"{col.Description}{headerRow}:{col.PositionTariff}{headerRow}");
        if (multi) headerRange = ws.Range($"{col.Customer}{headerRow}:{col.PositionTariff}{headerRow}");
        ws.Row(headerRow).Height = 18;
        var hStyle = headerRange.Style;
        hStyle.Font.FontName = "Times New Roman"; hStyle.Font.FontSize = 14; hStyle.Font.Bold = true;
        hStyle.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        hStyle.Border.TopBorder = XLBorderStyleValues.Medium;
        hStyle.Border.LeftBorder = XLBorderStyleValues.Medium;
        hStyle.Border.RightBorder = XLBorderStyleValues.Medium;
        hStyle.Border.InsideBorder = XLBorderStyleValues.Thin;

        // ── Item rows starting at 12 ──
        var firstItemRow = 12;
        var r = firstItemRow;
        var lines = packages.SelectMany(p => p.Items.OrderBy(i => i.Id).Select(i => new { Package = p, Item = i })).ToList();

        foreach (var line in lines)
        {
            var goodName = (line.Item.GoodType?.NameEn ?? $"GoodType #{line.Item.GoodTypeId}").ToUpperInvariant();
            var unitCode = UnitLabels.ExcelCode.TryGetValue(line.Item.Unit, out var ec) ? ec : line.Item.Unit.ToString().ToUpperInvariant();
            var unitPrice = line.Item.UnitPrice ?? 10m;

            if (multi) ws.Cell($"{col.Customer}{r}").Value = line.Package.Customer.Name;
            ws.Cell($"{col.Description}{r}").Value = goodName;
            ws.Cell($"{col.Qty}{r}").Value = line.Item.Quantity;
            ws.Cell($"{col.Unit}{r}").Value = unitCode;
            ws.Cell($"{col.UnitPrice}{r}").Value = unitPrice;
            ws.Cell($"{col.Total}{r}").FormulaA1 = $"={col.Qty}{r}*{col.UnitPrice}{r}";
            ws.Cell($"{col.C}{r}").FormulaA1 = $"={col.Total}{r}*$F$8";
            // POSITION TARRIFAIRE col left blank for ops to fill in manually.
            ws.Cell($"{col.HFormula}{r}").FormulaA1 = $"={col.C}{r}*{col.PositionTariff}{r}*{rates.CountryPerEur.ToString(System.Globalization.CultureInfo.InvariantCulture)}";

            var rowRange = multi
                ? ws.Range($"{col.Customer}{r}:{col.HFormula}{r}")
                : ws.Range($"{col.Description}{r}:{col.HFormula}{r}");
            var rs = rowRange.Style;
            rs.Font.FontName = "Times New Roman"; rs.Font.FontSize = 9; rs.Font.Bold = true;
            rs.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            rs.Border.InsideBorder = XLBorderStyleValues.Thin;
            rs.Border.LeftBorder = XLBorderStyleValues.Medium;
            rs.Border.RightBorder = XLBorderStyleValues.Medium;
            r++;
        }

        var lastItemRow = r - 1;
        if (lastItemRow < firstItemRow) lastItemRow = firstItemRow;

        // ── Footer rows ──
        var footerStart = lastItemRow + 1;
        ws.Cell($"A{footerStart}").Value = "TOTAL ($)";
        ws.Cell($"{col.Total}{footerStart}").FormulaA1 = $"=SUM({col.Total}{firstItemRow}:{col.Total}{lastItemRow})";
        ws.Cell($"{col.C}{footerStart}").FormulaA1 = $"=SUM({col.C}{firstItemRow}:{col.C}{lastItemRow})";
        ws.Cell($"{col.HFormula}{footerStart}").FormulaA1 = $"=SUM({col.HFormula}{firstItemRow}:{col.HFormula}{lastItemRow})";
        var totalsRange = ws.Range($"A{footerStart}:{col.HFormula}{footerStart}");
        totalsRange.Style.Font.FontName = "Century Gothic";
        totalsRange.Style.Font.FontSize = 12; totalsRange.Style.Font.Bold = true;
        totalsRange.Style.Border.TopBorder = XLBorderStyleValues.Medium;
        totalsRange.Style.Border.BottomBorder = XLBorderStyleValues.Medium;

        var fr = footerStart + 1;
        ws.Cell($"A{fr}").Value = "FRIEGHT ($)"; // Preserve original misspelling
        ws.Cell($"{col.Total}{fr}").Value = tpl.DefaultFreight;

        fr++;
        ws.Cell($"A{fr}").Value = $"TOTAL CFR {destCity} ($)";
        ws.Cell($"{col.Total}{fr}").FormulaA1 = $"={col.Total}{footerStart}+{col.Total}{footerStart + 1}";

        fr++;
        ws.Cell($"A{fr}").Value = $"TOTAL CFR {destCity} EQUIVALENT (EURO) ";
        ws.Cell($"{col.Total}{fr}").FormulaA1 = $"={col.Total}{fr - 1}/{rates.EurPerBase.ToString(System.Globalization.CultureInfo.InvariantCulture)}";

        fr += 2; // spacer
        ws.Cell($"A{fr}").Value = "GENERAL TERMS AND CONDITIONS:";
        ws.Cell($"A{fr}").Style.Font.Bold = true;

        fr++;
        ws.Cell($"A{fr}").Value = "NO OF PACKAGES:";
        // ClosedXML doesn't accept FormulaA1 on a merged range — set on the first cell, then merge.
        ws.Cell($"C{fr}").FormulaA1 = $"=SUM({col.Qty}{firstItemRow}:{col.Qty}{lastItemRow})";
        ws.Range($"C{fr}:D{fr}").Merge();

        fr++;
        ws.Cell($"A{fr}").Value = "DELIVERY TERM:";
        ws.Range($"C{fr}:D{fr}").Merge().Value = $"CFR {destCity} PORT";

        fr++;
        ws.Cell($"A{fr}").Value = "PAYMENT TERM:";
        ws.Range($"C{fr}:D{fr}").Merge().Value = tpl.PaymentTerms;

        fr++;
        ws.Cell($"A{fr}").Value = "BENEFICIARY:";
        ws.Range($"C{fr}:D{fr}").Merge().Value = tpl.Beneficiary;

        fr++;
        ws.Range($"A{fr}:B{fr}").Merge().Value = "BANK NAME:";
        ws.Range($"C{fr}:D{fr}").Merge().Value = tpl.BankName;

        fr++;
        ws.Range($"C{fr}:D{fr}").Merge().Value = tpl.BankBranch;

        fr++;
        ws.Range($"C{fr}:D{fr}").Merge().Value = tpl.BankSwift;

        fr++;
        ws.Range($"C{fr}:E{fr}").Merge().Value = tpl.BankIban;

        fr += 2;
        ws.Cell($"A{fr}").Value = tpl.ThankYou;

        ws.PageSetup.PageOrientation = XLPageOrientation.Portrait;
        ws.PageSetup.FitToPages(1, 0);
    }

    private static void FillPackingListSheet(
        IXLWorksheet ws,
        Shipment shipment,
        List<Package> packages,
        Customer primaryCustomer,
        bool multi,
        int invoiceNumber,
        int invoiceYear,
        DateTime invoiceDate,
        string country2)
    {
        ws.Column("A").Width = 59.54;
        ws.Column("B").Width = 9.27;
        ws.Column("C").Width = 14.91;
        ws.Column("D").Width = 13.27;

        ws.Range("A1:D1").Merge().Value = "Queen's Sleep";
        ws.Row(1).Height = 40;
        var c1 = ws.Range("A1:D1").Style;
        c1.Font.FontName = "Algerian"; c1.Font.FontSize = 28; c1.Font.Bold = true;
        c1.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

        ws.Range("A2:D2").Merge().Value = " FOR INDUSTRY & TRADING";
        var c2 = ws.Range("A2:D2").Style;
        c2.Font.FontName = "Century Gothic"; c2.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

        ws.Range("A3:D3").Merge().Value = "Since 1974";
        var c3 = ws.Range("A3:D3").Style;
        c3.Font.FontName = "Century Gothic"; c3.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

        ws.Range("A4:D4").Merge().Value = "PACKING LIST";
        var c4 = ws.Range("A4:D4").Style;
        c4.Font.FontName = "Century Gothic"; c4.Font.FontSize = 11; c4.Font.Bold = true;
        c4.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

        ws.Cell("A6").Value = $"To Client: {primaryCustomer.Name}";
        ws.Cell("C6").Value = "Date       ";
        ws.Cell("D6").Value = $" :  {invoiceDate:dd / MM /yyyy}";

        ws.Cell("A7").Value = $"Street Address:{primaryCustomer.BillingAddress ?? string.Empty}";
        ws.Cell("C7").Value = "Packing List ";
        ws.Cell("D7").Value = $":  No. {invoiceNumber}  -{invoiceYear}";

        var plCountryPrefix = string.IsNullOrEmpty(country2) ? "" : country2 + " / ";
        ws.Cell("A8").Value = $"{plCountryPrefix}TEL: {primaryCustomer.PrimaryPhone}";
        ws.Cell("C8").Value = "Customer ID";
        ws.Cell("D8").Value = $": {country2}{primaryCustomer.Id} \\\\ {shipment.RefCode}";

        ws.Cell("A9").Value = $"CONTAINER : {shipment.TiiuCode ?? string.Empty}";

        // Multi-customer for PL: insert Customer at A, push Description/Qty/Packaging/Unit right
        var col = multi
            ? new PlColumns("A", "B", "C", "D", "E")
            : new PlColumns(null, "A", "B", "C", "D");

        var headerRow = 11;
        if (multi) ws.Cell($"{col.Customer}{headerRow}").Value = "Customer";
        ws.Cell($"{col.Description}{headerRow}").Value = "DESCRIPTION";
        ws.Cell($"{col.Qty}{headerRow}").Value = "QTY";
        ws.Cell($"{col.Packaging}{headerRow}").Value = "PACKAGING ";
        ws.Cell($"{col.UnitCode}{headerRow}").Value = "UNIT";

        var headerRange = multi
            ? ws.Range($"{col.Customer}{headerRow}:{col.UnitCode}{headerRow}")
            : ws.Range($"{col.Description}{headerRow}:{col.UnitCode}{headerRow}");
        var hStyle = headerRange.Style;
        hStyle.Font.FontName = "Times New Roman"; hStyle.Font.FontSize = 12; hStyle.Font.Bold = true;
        hStyle.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        hStyle.Border.TopBorder = XLBorderStyleValues.Medium;
        hStyle.Border.InsideBorder = XLBorderStyleValues.Thin;

        var firstItemRow = 12;
        var r = firstItemRow;
        var lines = packages.SelectMany(p => p.Items.OrderBy(i => i.Id).Select(i => new { Package = p, Item = i })).ToList();
        foreach (var line in lines)
        {
            var unitCode = UnitLabels.ExcelCode.TryGetValue(line.Item.Unit, out var ec) ? ec : line.Item.Unit.ToString().ToUpperInvariant();
            if (multi) ws.Cell($"{col.Customer}{r}").Value = line.Package.Customer.Name;
            ws.Cell($"{col.Description}{r}").Value = (line.Item.GoodType?.NameEn ?? $"GoodType #{line.Item.GoodTypeId}").ToUpperInvariant();
            ws.Cell($"{col.Qty}{r}").Value = line.Item.Quantity;
            ws.Cell($"{col.Packaging}{r}").Value = line.Item.Quantity;
            ws.Cell($"{col.UnitCode}{r}").Value = unitCode;
            r++;
        }
        var lastItemRow = r - 1;
        if (lastItemRow < firstItemRow) lastItemRow = firstItemRow;

        var footerStart = lastItemRow + 1;
        ws.Cell($"A{footerStart}").Value = "Total Number of Packages";
        ws.Cell($"{col.UnitCode}{footerStart}").FormulaA1 = $"=SUM({col.Qty}{firstItemRow}:{col.Qty}{lastItemRow})";
        var ts = ws.Range($"A{footerStart}:{col.UnitCode}{footerStart}").Style;
        ts.Font.FontName = "Times New Roman"; ts.Font.FontSize = 11; ts.Font.Bold = true;
        ts.Border.TopBorder = XLBorderStyleValues.Medium;
        ts.Border.BottomBorder = XLBorderStyleValues.Medium;

        ws.Cell($"A{footerStart + 2}").Value = "Thank you for your business!";

        ws.PageSetup.PageOrientation = XLPageOrientation.Portrait;
        ws.PageSetup.FitToPages(1, 0);
    }

    private record ItemColumns(
        string? Customer,
        string Description,
        string Qty,
        string Unit,
        string UnitPrice,
        string Total,
        string C,
        string PositionTariff,
        string HFormula);

    private record PlColumns(
        string? Customer,
        string Description,
        string Qty,
        string Packaging,
        string UnitCode);
}

internal static class CountryCodeHelper
{
    // Map warehouse country names to 2-letter ISO codes used in the invoice template.
    private static readonly IReadOnlyDictionary<string, string> CountryToIso = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
    {
        ["Lebanon"] = "LB",
        ["Gabon"] = "GA",
        ["China"] = "CN",
        ["UAE"] = "AE",
        ["United Arab Emirates"] = "AE",
    };

    // Override: if the warehouse country does not match any known name, fall back to the
    // first three letters of the warehouse code (which is itself meant to be a country/airport code).
    public static string FromWarehouseCountry(string? country)
    {
        if (string.IsNullOrWhiteSpace(country)) return string.Empty;
        if (CountryToIso.TryGetValue(country.Trim(), out var iso)) return iso;
        // Fallback: first 2 letters uppercased
        return country.Length >= 2 ? country[..2].ToUpperInvariant() : country.ToUpperInvariant();
    }
}
