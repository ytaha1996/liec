namespace ShippingPlatform.Api.Services.Exports;

public class InvoiceTemplateConstants
{
    public string CompanyName { get; init; } = "Queen's Sleep";
    public string CompanyTagline { get; init; } = " FOR INDUSTRY & TRADING";
    public string CompanyEstablished { get; init; } = "Since 1974";
    public string Beneficiary { get; init; } = "Queen's sleep for industry and trading";
    public string BankName { get; init; } = "BLOM BANK ";
    public string BankBranch { get; init; } = "SAIDA BRANCH";
    public string BankSwift { get; init; } = "SWIFT: BLOMLBBX";
    public string BankIban { get; init; } = "EURO NO: LB07001400001202353226519913";
    public string PaymentTerms { get; init; } = "100 % TT 150 DAYS BL DATE";
    public string ThankYou { get; init; } = "Thank you for your business!";
    public decimal DefaultFreight { get; init; } = 2550m;

    public static InvoiceTemplateConstants FromConfig(IConfiguration cfg)
    {
        var section = cfg.GetSection("InvoiceTemplate");
        var defaults = new InvoiceTemplateConstants();
        return new InvoiceTemplateConstants
        {
            CompanyName            = section["CompanyName"]            ?? defaults.CompanyName,
            CompanyTagline         = section["CompanyTagline"]         ?? defaults.CompanyTagline,
            CompanyEstablished     = section["CompanyEstablished"]     ?? defaults.CompanyEstablished,
            Beneficiary            = section["Beneficiary"]            ?? defaults.Beneficiary,
            BankName               = section["BankName"]               ?? defaults.BankName,
            BankBranch             = section["BankBranch"]             ?? defaults.BankBranch,
            BankSwift              = section["BankSwift"]              ?? defaults.BankSwift,
            BankIban               = section["BankIban"]               ?? defaults.BankIban,
            PaymentTerms           = section["PaymentTerms"]           ?? defaults.PaymentTerms,
            ThankYou               = section["ThankYou"]               ?? defaults.ThankYou,
            DefaultFreight         = decimal.TryParse(section["DefaultFreight"], out var df) ? df : defaults.DefaultFreight,
        };
    }
}
