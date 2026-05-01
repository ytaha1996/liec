using FluentValidation;
using ShippingPlatform.Api.Dtos;
using ShippingPlatform.Api.Models;

namespace ShippingPlatform.Api.Validators;

public class LoginRequestValidator : AbstractValidator<LoginRequest>
{
    public LoginRequestValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Password).NotEmpty();
    }
}

public class CreateCustomerRequestValidator : AbstractValidator<CreateCustomerRequest>
{
    public CreateCustomerRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.PrimaryPhone).NotEmpty().MaximumLength(30);
        RuleFor(x => x.Email).EmailAddress().When(x => !string.IsNullOrWhiteSpace(x.Email)).MaximumLength(200);
    }
}

public class CreateShipmentRequestValidator : AbstractValidator<CreateShipmentRequest>
{
    public CreateShipmentRequestValidator()
    {
        RuleFor(x => x.OriginWarehouseId).GreaterThan(0);
        RuleFor(x => x.DestinationWarehouseId).GreaterThan(0);
        RuleFor(x => x).Must(x => x.OriginWarehouseId != x.DestinationWarehouseId).WithMessage("Origin and destination must be different.");
        RuleFor(x => x.TiiuCode).Matches(@"^[A-Z]{3,4}\d{4,7}$").WithMessage("TIIU code must be 3-4 letters followed by 4-7 digits (e.g., MSCU1234567).").When(x => !string.IsNullOrWhiteSpace(x.TiiuCode));
    }
}

public class UpdateCustomerRequestValidator : AbstractValidator<UpdateCustomerRequest>
{
    public UpdateCustomerRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.PrimaryPhone).NotEmpty().MaximumLength(30);
        RuleFor(x => x.Email).EmailAddress().When(x => !string.IsNullOrWhiteSpace(x.Email)).MaximumLength(200);
    }
}

public class UpsertWarehouseRequestValidator : AbstractValidator<UpsertWarehouseRequest>
{
    public UpsertWarehouseRequestValidator()
    {
        RuleFor(x => x.Code).NotEmpty().MaximumLength(10);
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.City).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Country).NotEmpty().MaximumLength(100);
        RuleFor(x => x.MaxWeightKg).GreaterThanOrEqualTo(0);
        RuleFor(x => x.MaxCbm).GreaterThanOrEqualTo(0);
    }
}

public class UpsertGoodTypeRequestValidator : AbstractValidator<UpsertGoodTypeRequest>
{
    public UpsertGoodTypeRequestValidator()
    {
        RuleFor(x => x.NameEn).NotEmpty().MaximumLength(200);
        RuleFor(x => x.NameAr).NotEmpty().MaximumLength(200);
    }
}

public class CreatePackageRequestValidator : AbstractValidator<CreatePackageRequest>
{
    public CreatePackageRequestValidator()
    {
        RuleFor(x => x.CustomerId).GreaterThan(0);
        RuleFor(x => x.WeightKg).GreaterThanOrEqualTo(0).When(x => x.WeightKg.HasValue);
        RuleFor(x => x.Cbm).GreaterThanOrEqualTo(0).When(x => x.Cbm.HasValue);
        RuleFor(x => x.Note).MaximumLength(1000);
    }
}

public class UpdatePackageRequestValidator : AbstractValidator<UpdatePackageRequest>
{
    public UpdatePackageRequestValidator()
    {
        RuleFor(x => x.WeightKg).GreaterThan(0).When(x => x.WeightKg.HasValue);
        RuleFor(x => x.Cbm).GreaterThan(0).When(x => x.Cbm.HasValue);
        RuleFor(x => x.Note).MaximumLength(1000);
    }
}

public class UpsertPackageItemRequestValidator : AbstractValidator<UpsertPackageItemRequest>
{
    public UpsertPackageItemRequestValidator()
    {
        RuleFor(x => x.GoodTypeId).GreaterThan(0);
        RuleFor(x => x.Quantity).GreaterThanOrEqualTo(1);
        RuleFor(x => x.Unit).IsInEnum();
        RuleFor(x => x.UnitPrice).InclusiveBetween(0m, 1_000_000m).When(x => x.UnitPrice.HasValue);
        RuleFor(x => x.Note).MaximumLength(500);
    }
}

public class ApplyPricingOverrideRequestValidator : AbstractValidator<ApplyPricingOverrideRequest>
{
    public ApplyPricingOverrideRequestValidator()
    {
        RuleFor(x => x.Reason).NotEmpty().MaximumLength(500);
        RuleFor(x => x.NewValue).GreaterThan(0).When(x => x.OverrideType != PricingOverrideType.TotalCharge);
        RuleFor(x => x.NewValue).GreaterThanOrEqualTo(0).When(x => x.OverrideType == PricingOverrideType.TotalCharge);
    }
}

public class UpsertPricingConfigRequestValidator : AbstractValidator<UpsertPricingConfigRequest>
{
    public UpsertPricingConfigRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Currency).NotEmpty().MaximumLength(10);
        RuleFor(x => x.DefaultRatePerKg).GreaterThan(0);
        RuleFor(x => x.DefaultRatePerCbm).GreaterThan(0);
    }
}

public class ExportRequestValidator : AbstractValidator<ExportRequest>
{
    public ExportRequestValidator()
    {
        RuleFor(x => x.Format).Must(x => x?.ToLower() is "csv" or "vcf");
    }
}

public class CreateUserRequestValidator : AbstractValidator<CreateUserRequest>
{
    public CreateUserRequestValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(200);
        RuleFor(x => x.Password).NotEmpty().MinimumLength(8);
        RuleFor(x => x.Role).IsInEnum();
    }
}

public class UpdateUserRequestValidator : AbstractValidator<UpdateUserRequest>
{
    public UpdateUserRequestValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(200);
        RuleFor(x => x.Role).IsInEnum();
    }
}

public class UpsertCurrencyRequestValidator : AbstractValidator<UpsertCurrencyRequest>
{
    public UpsertCurrencyRequestValidator()
    {
        RuleFor(x => x.Code).NotEmpty().Length(3).Matches(@"^[A-Za-z]{3}$").WithMessage("Currency code must be 3 letters (ISO 4217).");
        RuleFor(x => x.Name).NotEmpty().MaximumLength(60);
        RuleFor(x => x.Symbol).MaximumLength(8);
        RuleFor(x => x.AnchorCurrencyCode).NotEmpty().Length(3).When(x => !x.IsBase).WithMessage("Non-base currencies require AnchorCurrencyCode.");
        RuleFor(x => x.Rate).NotNull().GreaterThan(0).When(x => !x.IsBase).WithMessage("Non-base currencies require a positive Rate.");
        RuleFor(x => x.AnchorCurrencyCode).Must((req, anchor) => !string.Equals(anchor, req.Code, StringComparison.OrdinalIgnoreCase))
            .When(x => !x.IsBase && !string.IsNullOrEmpty(x.AnchorCurrencyCode))
            .WithMessage("Currency cannot anchor to itself.");
    }
}

public class UpsertManualRateRequestValidator : AbstractValidator<UpsertManualRateRequest>
{
    public UpsertManualRateRequestValidator()
    {
        RuleFor(x => x.RateToBase).GreaterThan(0).LessThanOrEqualTo(1_000_000m);
    }
}
