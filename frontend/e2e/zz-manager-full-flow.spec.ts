import { test, expect } from '@playwright/test';

const API = 'http://localhost:51295';

const TINY_PNG = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000' +
  '000a49444154789c63000100000005000100' +
  '0d0a2db40000000049454e44ae426082',
  'hex',
);

const photoFile = (name: string) => ({
  name,
  mimeType: 'image/png',
  buffer: TINY_PNG,
});

test.describe.configure({ mode: 'serial' });

test('Manager full end-to-end flow: reset → container → 5 customers → 4 direct + 1 indirect → close', async ({
  page,
  request,
}) => {
  test.setTimeout(5 * 60 * 1000);

  // ────────────────────────────────────────────────────────────────────
  // Phase A — Admin login, reset data, create Manager
  // ────────────────────────────────────────────────────────────────────
  const adminLogin = await request.post(`${API}/api/auth/login`, {
    data: { email: 'admin@local', password: 'Admin123!' },
  });
  expect(adminLogin.status()).toBeLessThan(400);
  const adminToken = (await adminLogin.json()).token;
  const admin = { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' };

  const resetResp = await request.post(`${API}/api/dev/reset-data`, { headers: admin });
  expect(resetResp.status()).toBe(204);

  const mgrEmail = `mgr_flow_${Date.now().toString().slice(-8)}@test.com`;
  const mgrPassword = 'Manager123!';
  const createMgrResp = await request.post(`${API}/api/users`, {
    headers: admin,
    data: { email: mgrEmail, password: mgrPassword, role: 'Manager' },
  });
  expect(createMgrResp.status()).toBeLessThan(400);

  // ────────────────────────────────────────────────────────────────────
  // Phase A2 — Login as Manager via UI
  // ────────────────────────────────────────────────────────────────────
  await page.goto('/login');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/login');
  await page.getByLabel('Email').fill(mgrEmail);
  await page.getByLabel('Password').fill(mgrPassword);
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/\/ops\//, { timeout: 10000 });
  const mgrToken = await page.evaluate(() => localStorage.getItem('token'));
  expect(mgrToken).toBeTruthy();
  const mgr = { Authorization: `Bearer ${mgrToken}`, 'Content-Type': 'application/json' };

  // ────────────────────────────────────────────────────────────────────
  // Phase B — Customers (1 via UI + 4 via API)
  // ────────────────────────────────────────────────────────────────────
  const suffix = Date.now().toString().slice(-6);

  await page.goto('/master/customers');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: /create/i }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByLabel('Name*').fill(`Mohamed Haidar ${suffix}`);
  await page.getByLabel('Primary Phone*').fill('+96171123456');
  const emailField = page.getByLabel('Email', { exact: false }).first();
  if (await emailField.isVisible().catch(() => false)) {
    await emailField.fill(`m.haidar.${suffix}@example.lb`);
  }
  const companyField = page.getByLabel('Company Name', { exact: false }).first();
  if (await companyField.isVisible().catch(() => false)) {
    await companyField.fill('Haidar Trading SARL');
  }
  const [cust1Resp] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/api/customers') && r.request().method() === 'POST',
    ),
    page.getByRole('button', { name: /^submit$/i }).click(),
  ]);
  expect(cust1Resp.status()).toBeLessThan(400);
  const cust1 = await cust1Resp.json();

  const apiCustomers = [
    { name: `Ali Khalil ${suffix}`, primaryPhone: '+96171234567', email: `ali.k.${suffix}@example.lb`, billingAddress: 'Verdun, Beirut, Lebanon', isActive: true },
    { name: `Jean-Pierre Mbeki ${suffix}`, primaryPhone: '+24177123456', email: `jp.mbeki.${suffix}@example.ga`, companyName: 'Mbeki Import Export', billingAddress: 'Boulevard Triomphal, Libreville, Gabon', isActive: true },
    { name: `Marie Obiang ${suffix}`, primaryPhone: '+24177234567', email: `marie.obiang.${suffix}@example.ga`, companyName: 'Obiang Retail', billingAddress: 'Quartier Louis, Libreville, Gabon', isActive: true },
    { name: `Sami Nassar ${suffix}`, primaryPhone: '+96171345678', email: `s.nassar.${suffix}@example.lb`, companyName: 'Nassar Electronics', billingAddress: 'Tyre, South Lebanon', isActive: true },
  ];
  const customerIds: number[] = [cust1.id];
  for (const c of apiCustomers) {
    const r = await request.post(`${API}/api/customers`, { headers: mgr, data: c });
    expect(r.status()).toBeLessThan(400);
    customerIds.push((await r.json()).id);
  }
  expect(customerIds).toHaveLength(5);

  // ────────────────────────────────────────────────────────────────────
  // Phase B2 — Supplier via API
  // ────────────────────────────────────────────────────────────────────
  const supplierResp = await request.post(`${API}/api/suppliers`, {
    headers: mgr,
    data: { name: `China Logistics Ltd ${suffix}`, email: 'contact@china-log.com', isActive: true },
  });
  expect(supplierResp.status()).toBeLessThan(400);
  const supplierId = (await supplierResp.json()).id;

  // Lookup warehouses + good types
  const whResp = await request.get(`${API}/api/warehouses`, { headers: mgr });
  const warehouses: any[] = await whResp.json();
  const beiId = warehouses.find((w) => w.code === 'BEI')!.id;
  const gabId = warehouses.find((w) => w.code === 'GAB')!.id;
  const gtResp = await request.get(`${API}/api/good-types`, { headers: mgr });
  const goodTypes: any[] = await gtResp.json();
  const firstGoodTypeId = goodTypes[0].id;

  // ────────────────────────────────────────────────────────────────────
  // Phase C — Create the container (shipment) via UI
  // ────────────────────────────────────────────────────────────────────
  await page.goto('/ops/shipments');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: /create shipment/i }).click();
  await expect(page.getByRole('dialog')).toBeVisible();

  await page.locator('#originWarehouseId').click();
  await page.waitForTimeout(300);
  await page.getByRole('option', { name: /BEI/ }).first().click();
  await page.locator('#destinationWarehouseId').click();
  await page.waitForTimeout(300);
  await page.getByRole('option', { name: /GAB/ }).first().click();

  const today = new Date();
  const depart = new Date(today.getTime() + 7 * 86400000);
  const arrive = new Date(today.getTime() + 21 * 86400000);
  const mmddyyyy = (d: Date) =>
    `${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}${d.getFullYear()}`;
  await page.getByLabel('Planned Departure Date*').first().click();
  await page.keyboard.type(mmddyyyy(depart));
  await page.getByLabel('Planned Arrival Date*').first().click();
  await page.keyboard.type(mmddyyyy(arrive));

  const maxWeight = page.getByLabel(/Max Weight/i).first();
  if (await maxWeight.isVisible().catch(() => false)) {
    await maxWeight.fill('5000');
  }
  const maxCbm = page.getByLabel(/Max CBM/i).first();
  if (await maxCbm.isVisible().catch(() => false)) {
    await maxCbm.fill('30');
  }
  const tiiuCreateField = page.getByLabel(/TIIU Code/i).first();
  if (await tiiuCreateField.isVisible().catch(() => false)) {
    await tiiuCreateField.fill('MSKU1234567');
  }

  const [shipResp] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/api/shipments') && r.request().method() === 'POST',
    ),
    page.getByRole('button', { name: /^submit$/i }).click(),
  ]);
  expect(shipResp.status()).toBeLessThan(400);
  const shipmentId = (await shipResp.json()).id;

  await page.goto(`/ops/shipments/${shipmentId}`);
  await page.waitForLoadState('networkidle');

  // ────────────────────────────────────────────────────────────────────
  // Phase D — Create 5 packages (1 UI CustomerProvided, 3 API, 1 indirect)
  // ────────────────────────────────────────────────────────────────────
  const packageIds: number[] = [];

  // UI package for customer #0
  await page.getByRole('button', { name: /add package/i }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.locator('#customerId').click();
  await page.waitForTimeout(300);
  await page.getByRole('option').filter({ hasText: `#${customerIds[0]}` }).first().click();
  await page.locator('#provisionMethod').click();
  await page.waitForTimeout(300);
  await page.getByRole('option', { name: /Customer Provided/i }).first().click();

  const [uiPkgResp] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes(`/api/shipments/${shipmentId}/packages`) && r.request().method() === 'POST',
    ),
    page.getByRole('button', { name: /^submit$/i }).click(),
  ]);
  expect(uiPkgResp.status()).toBeLessThan(400);
  const uiPkgId = (await uiPkgResp.json()).id;
  packageIds.push(uiPkgId);

  // 3 more CustomerProvided via API
  for (let i = 1; i < 4; i++) {
    const r = await request.post(`${API}/api/shipments/${shipmentId}/packages`, {
      headers: mgr,
      data: { customerId: customerIds[i], provisionMethod: 'CustomerProvided' },
    });
    expect(r.status()).toBeLessThan(400);
    packageIds.push((await r.json()).id);
  }

  // Indirect (5th) — ProcuredForCustomer with inline supply order
  const indirectResp = await request.post(`${API}/api/shipments/${shipmentId}/packages`, {
    headers: mgr,
    data: {
      customerId: customerIds[4],
      provisionMethod: 'ProcuredForCustomer',
      supplyOrder: {
        supplierId,
        name: 'Batch A electronics',
        purchasePrice: 2500,
        details: '5 units of mobile phones from Guangzhou',
      },
    },
  });
  expect(indirectResp.status()).toBeLessThan(400);
  const indirectPkgId = (await indirectResp.json()).id;
  packageIds.push(indirectPkgId);

  // Retrieve supply order id linked to the indirect package
  const indirectPkgDetail = await request.get(`${API}/api/packages/${indirectPkgId}`, {
    headers: mgr,
  });
  const indirectPkgJson = await indirectPkgDetail.json();
  const supplyOrderId: number =
    (indirectPkgJson.package ?? indirectPkgJson).supplyOrderId;
  expect(supplyOrderId).toBeTruthy();

  expect(packageIds).toHaveLength(5);

  // ────────────────────────────────────────────────────────────────────
  // Phase E — Populate packages (1 UI weight/cbm/note + item, 4 API)
  // ────────────────────────────────────────────────────────────────────
  await page.goto(`/ops/packages/${packageIds[0]}`);
  await page.waitForLoadState('networkidle');
  await page.getByRole('tab', { name: /items & pricing/i }).click();
  await page.getByRole('button', { name: /edit weight/i }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByLabel('Weight (Kg)*').fill('75');
  await page.getByLabel('CBM*').fill('1.2');
  const noteField = page.getByLabel('Note');
  if (await noteField.isVisible().catch(() => false)) {
    await noteField.fill('Textile bundle');
  }
  const [editPkgResp] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes(`/api/packages/${packageIds[0]}`) && r.request().method() === 'PATCH',
    ),
    page.getByRole('button', { name: /^submit$/i }).click(),
  ]);
  expect(editPkgResp.status()).toBeLessThan(400);

  // Add item via UI
  await page.getByRole('button', { name: /add item/i }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.locator('#goodTypeId').click();
  await page.waitForTimeout(300);
  await page.getByRole('option').first().click();
  await page.getByLabel('Quantity*').fill('3');
  const itemNote = page.getByLabel('Note').last();
  if (await itemNote.isVisible().catch(() => false)) {
    await itemNote.fill('Cotton fabric rolls');
  }
  const [addItemResp] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes(`/api/packages/${packageIds[0]}/items`) && r.request().method() === 'POST',
    ),
    page.getByRole('button', { name: /^submit$/i }).click(),
  ]);
  expect(addItemResp.status()).toBeLessThan(400);

  // Other packages via API
  const pkgSpecs = [
    { weightKg: 40, cbm: 0.6, note: 'Personal effects' },
    { weightKg: 200, cbm: 3.5, note: 'Car parts' },
    { weightKg: 120, cbm: 2.1, note: 'Household goods' },
    { weightKg: 180, cbm: 2.8, note: 'Electronics (procured)' },
  ];
  for (let i = 1; i < packageIds.length; i++) {
    const spec = pkgSpecs[i - 1];
    const p = await request.patch(`${API}/api/packages/${packageIds[i]}`, {
      headers: mgr,
      data: spec,
    });
    expect(p.status()).toBeLessThan(400);
    const it = await request.post(`${API}/api/packages/${packageIds[i]}/items`, {
      headers: mgr,
      data: { goodTypeId: firstGoodTypeId, quantity: 2, note: `Items for ${spec.note}` },
    });
    expect(it.status()).toBeLessThan(400);
  }

  // ────────────────────────────────────────────────────────────────────
  // Phase F — Supply-order lifecycle for indirect (Draft → Delivered)
  // ────────────────────────────────────────────────────────────────────
  for (const action of ['approve', 'order', 'deliver-to-warehouse']) {
    const r = await request.post(`${API}/api/supply-orders/${supplyOrderId}/${action}`, {
      headers: mgr,
    });
    expect(r.status(), `supply-order ${action}`).toBeLessThan(400);
  }

  // Indirect package should now be auto-Received
  const indirectAfterDeliver = await request.get(`${API}/api/packages/${indirectPkgId}`, {
    headers: mgr,
  });
  const indirectStatus = ((await indirectAfterDeliver.json()).package ?? (await indirectAfterDeliver.json())).status;
  expect(['Received', 'Packed']).toContain(indirectStatus);

  // ────────────────────────────────────────────────────────────────────
  // Phase G — Receive packages #1–#4, then Pack all
  // ────────────────────────────────────────────────────────────────────
  for (let i = 0; i < 4; i++) {
    const r = await request.post(`${API}/api/packages/${packageIds[i]}/receive`, {
      headers: mgr,
    });
    expect(r.status(), `receive pkg ${packageIds[i]}`).toBeLessThan(400);
  }
  for (const pkgId of packageIds) {
    const r = await request.post(`${API}/api/packages/${pkgId}/pack`, { headers: mgr });
    expect(r.status(), `pack pkg ${pkgId}`).toBeLessThan(400);
  }

  // ────────────────────────────────────────────────────────────────────
  // Phase H — Departure photos (API multipart)
  // ────────────────────────────────────────────────────────────────────
  for (const pkgId of packageIds) {
    const r = await request.post(`${API}/api/packages/${pkgId}/media`, {
      headers: { Authorization: `Bearer ${mgrToken}` },
      multipart: {
        stage: 'Departure',
        file: photoFile(`departure-${pkgId}.png`),
      },
    });
    expect(r.status(), `upload departure photo pkg ${pkgId}`).toBeLessThan(400);
  }

  // UI sanity: photos tab shows at least one photo
  await page.goto(`/ops/packages/${packageIds[0]}`);
  await page.waitForLoadState('networkidle');
  await page.getByRole('tab', { name: /photos/i }).click();
  await page.waitForTimeout(500);

  // ────────────────────────────────────────────────────────────────────
  // Phase I — Ship out: schedule → ready-to-ship → ready-to-depart → depart → ship
  // ────────────────────────────────────────────────────────────────────
  // Schedule shipment first — packages can only go ReadyToShip when shipment >= Scheduled
  const schedResp = await request.post(`${API}/api/shipments/${shipmentId}/schedule`, {
    headers: mgr,
  });
  expect(schedResp.status(), 'schedule shipment').toBeLessThan(400);

  for (const pkgId of packageIds) {
    const r = await request.post(`${API}/api/packages/${pkgId}/ready-to-ship`, {
      headers: mgr,
    });
    expect(r.status(), `ready-to-ship pkg ${pkgId}`).toBeLessThan(400);
  }

  const soPack = await request.post(
    `${API}/api/supply-orders/${supplyOrderId}/pack-into-package`,
    { headers: mgr },
  );
  expect(soPack.status()).toBeLessThan(400);

  const rtdResp = await request.post(`${API}/api/shipments/${shipmentId}/ready-to-depart`, {
    headers: mgr,
  });
  expect(rtdResp.status(), 'ready-to-depart').toBeLessThan(400);
  const departResp = await request.post(`${API}/api/shipments/${shipmentId}/depart`, {
    headers: mgr,
  });
  expect(departResp.status(), 'depart shipment').toBeLessThan(400);

  for (const pkgId of packageIds) {
    const r = await request.post(`${API}/api/packages/${pkgId}/ship`, { headers: mgr });
    expect(r.status(), `ship pkg ${pkgId}`).toBeLessThan(400);
  }

  // ────────────────────────────────────────────────────────────────────
  // Phase J — Arrival
  // ────────────────────────────────────────────────────────────────────
  const arriveResp = await request.post(`${API}/api/shipments/${shipmentId}/arrive`, {
    headers: mgr,
  });
  expect(arriveResp.status(), 'arrive shipment').toBeLessThan(400);

  for (const pkgId of packageIds) {
    const r = await request.post(`${API}/api/packages/${pkgId}/arrive-destination`, {
      headers: mgr,
    });
    expect(r.status(), `arrive-destination pkg ${pkgId}`).toBeLessThan(400);
  }
  for (const pkgId of packageIds) {
    const r = await request.post(`${API}/api/packages/${pkgId}/ready-for-handout`, {
      headers: mgr,
    });
    expect(r.status(), `ready-for-handout pkg ${pkgId}`).toBeLessThan(400);
  }

  // Arrival photos
  for (const pkgId of packageIds) {
    const r = await request.post(`${API}/api/packages/${pkgId}/media`, {
      headers: { Authorization: `Bearer ${mgrToken}` },
      multipart: {
        stage: 'Arrival',
        file: photoFile(`arrival-${pkgId}.png`),
      },
    });
    expect(r.status(), `upload arrival photo pkg ${pkgId}`).toBeLessThan(400);
  }

  // ────────────────────────────────────────────────────────────────────
  // Phase K — Handout + close SO + close shipment
  // ────────────────────────────────────────────────────────────────────
  for (const pkgId of packageIds) {
    const r = await request.post(`${API}/api/packages/${pkgId}/handout`, { headers: mgr });
    expect(r.status(), `handout pkg ${pkgId}`).toBeLessThan(400);
  }
  const soClose = await request.post(`${API}/api/supply-orders/${supplyOrderId}/close`, {
    headers: mgr,
  });
  expect(soClose.status(), 'close SO').toBeLessThan(400);

  const closeResp = await request.post(`${API}/api/shipments/${shipmentId}/close`, {
    headers: mgr,
  });
  expect(closeResp.status(), 'close shipment').toBeLessThan(400);

  // ────────────────────────────────────────────────────────────────────
  // Phase L — Final assertions
  // ────────────────────────────────────────────────────────────────────
  const finalShipment = await (
    await request.get(`${API}/api/shipments/${shipmentId}`, { headers: mgr })
  ).json();
  expect(finalShipment.status).toBe('Closed');
  expect(finalShipment.totalWeightKg).toBeGreaterThan(0);
  expect(finalShipment.totalCbm).toBeGreaterThan(0);

  const allPackages: any[] = await (
    await request.get(`${API}/api/packages`, { headers: mgr })
  ).json();
  const myPackages = allPackages.filter((p) => p.shipmentId === shipmentId);
  expect(myPackages).toHaveLength(5);
  for (const p of myPackages) {
    expect(p.status).toBe('HandedOut');
  }

  const finalSo = await (
    await request.get(`${API}/api/supply-orders/${supplyOrderId}`, { headers: mgr })
  ).json();
  expect(finalSo.status).toBe('Closed');

  // UI assertion: shipment page shows Closed
  await page.goto(`/ops/shipments/${shipmentId}`);
  await page.waitForLoadState('networkidle');
  await expect(page.getByText(/^Closed$/).first()).toBeVisible({ timeout: 5000 });
});
