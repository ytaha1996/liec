using Microsoft.AspNetCore.Mvc;
using ShippingPlatform.Api.Business;
using ShippingPlatform.Api.Dtos;

namespace ShippingPlatform.Api.Controllers;

[ApiController]
[Route("api/exports")]
public class ExportsController(IExportBusiness business) : ControllerBase
{
    [HttpPost("group-helper")]
    public async Task<IActionResult> GroupHelper(ExportRequest req) => Ok(await business.GroupHelperAsync(req.Format));

    [HttpPost("shipments/{shipmentId:int}/bol-report")]
    public async Task<IActionResult> ShipmentBolReport(int shipmentId) => Ok(await business.ShipmentBolReportAsync(shipmentId));

    [HttpPost("shipments/{shipmentId:int}/customer-invoices-excel")]
    public async Task<IActionResult> ShipmentCustomerInvoicesExcel(int shipmentId) => Ok(await business.ShipmentCustomerInvoicesExcelAsync(shipmentId));
}
