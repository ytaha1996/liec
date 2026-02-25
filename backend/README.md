# Backend (ASP.NET Core + EF Core + MySQL)

## Run
1. Set env vars:
   - `SEED_ADMIN_EMAIL`
   - `SEED_ADMIN_PASSWORD`
   - optional `ConnectionStrings__Default`
   - optional `AzureBlob__ConnectionString`
2. Restore/build:
   - `dotnet restore`
   - `dotnet build`
3. Run API:
   - `dotnet run --project ShippingPlatform.Api`
4. Swagger: `http://localhost:5000/swagger`

## Migrations
- Current placeholder migration: `ShippingPlatform.Api/Migrations/0001_Initial.cs`
- Generate real migration in a full .NET SDK environment:
  - `dotnet ef migrations add InitialCreate --project ShippingPlatform.Api`
  - `dotnet ef database update --project ShippingPlatform.Api`

## Notes
- Media and export uploads are stored in Azure Blob with `PublicAccessType.Blob` and persisted as `BlobKey` + `PublicUrl`.
- Gate failures return HTTP 409 with `code=PHOTO_GATE_FAILED`.
