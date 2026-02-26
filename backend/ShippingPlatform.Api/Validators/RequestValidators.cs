using FluentValidation;
using ShippingPlatform.Api.Dtos;

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
        RuleFor(x => x.Name).NotEmpty();
        RuleFor(x => x.PrimaryPhone).NotEmpty();
    }
}

public class CreateShipmentRequestValidator : AbstractValidator<CreateShipmentRequest>
{
    public CreateShipmentRequestValidator()
    {
        RuleFor(x => x.OriginWarehouseId).GreaterThan(0);
        RuleFor(x => x.DestinationWarehouseId).GreaterThan(0);
        RuleFor(x => x).Must(x => x.OriginWarehouseId != x.DestinationWarehouseId).WithMessage("Origin and destination must be different.");
    }
}

public class ExportRequestValidator : AbstractValidator<ExportRequest>
{
    public ExportRequestValidator()
    {
        RuleFor(x => x.Format).Must(x => x?.ToLower() is "csv" or "vcf");
    }
}
