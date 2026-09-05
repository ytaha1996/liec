using Microsoft.Extensions.Configuration;
using ShippingPlatform.Api.Services;

namespace ShippingPlatform.Api.Tests;

/// <summary>
/// Stand-ins for the services that reach outside the process. Unit tests must
/// not upload to Azure or re-encode images to prove a business rule.
/// </summary>
public sealed class NullBlobStorage : IBlobStorageService
{
    public Task<(string blobKey, string publicUrl)> UploadAsync(
        string container, string fileName, Stream stream, string contentType,
        string? forcedBlobKey = null, CancellationToken ct = default)
        => Task.FromResult((forcedBlobKey ?? $"{container}/{fileName}", $"https://test.local/{fileName}"));

    public Task DeleteAsync(string container, string blobKey, CancellationToken ct = default)
        => Task.CompletedTask;
}

public sealed class NullWatermark : IImageWatermarkService
{
    public WatermarkResult Apply(Stream input, string text, string contentType, string fileName)
        => new(input, contentType, Path.GetExtension(fileName));
}

/// <summary>Configuration with nothing in it, which is what these tests want.</summary>
public static class TestConfig
{
    public static IConfiguration Empty() =>
        new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>()).Build();
}
