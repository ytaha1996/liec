import { test, expect, type APIRequestContext } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { API, confirmDialog, expectToast, fillField, pickDate, pickSelect, scrollOptionIntoView, submitForm } from './helpers';

// ─────────────────────────────────────────────────────────────────────────────
// REAL-WORLD REPLAY: shipment "925" — Beirut → Libreville (Gabon).
// Source documents: 925 BOL.xlsx, 925 CLIENT DETAILS.xlsx, 925 FINAL INVOICE
// & PL GAB.xlsx (container TIIU6591456, BL BRT0299089, EXW 19 Aug 2025,
// POL 26 Aug 2025, POD 4 Nov 2025 — dates shifted to "today" for the test).
//
// The real tariff maps 1:1 onto the platform's pricing engine:
//   max(kg × 500 CFA, m³ × 275,000 CFA), minimum charge 120,000 CFA (<0.5 m³),
//   regular customers 250,000 CFA/m³ (rate override), 450,000 CFA/ton weight
//   deals (rate override), customs/rounding fees + free packages (total-charge
//   override). Every package's final charge must equal the BOL "TOTAL PRICE"
//   column, and the grand total must equal the BOL's 19,475,000 CFA.
//
// Named zz-* so it runs LAST: it adds 28 customers and activates a new pricing
// config, which would disturb seed-count assertions in earlier specs.
// ─────────────────────────────────────────────────────────────────────────────

type UnitName = 'Box' | 'Piece' | 'Crt' | 'Bag' | 'Pallet' | 'Gallon' | 'Bundle';
type RealItem = { gt: string; qty: number; unit: UnitName; note: string };
type Override = { type: 'RatePerKg' | 'RatePerCbm' | 'TotalCharge'; value: number; reason: string };
type RealClient = {
  code: string; // order-form / BOL client code
  name: string;
  phone: string; // E.164 (+241 Gabon / +961 Lebanon)
  cbm: number;
  kg: number;
  expected: number; // BOL "TOTAL PRICE" (CFA)
  remark?: string;
  overrides?: Override[];
  items: RealItem[];
};

const TIIU = 'TIIU6591456';
const GRAND_TOTAL_CFA = 19_475_000;
const TOTAL_CBM = 75.37;
const TOTAL_KG = 28_570;
const STAMP = Date.now().toString().slice(-6);

// Extra good types found in the real manifests (find-or-create; the rest map
// onto the seeded catalogue: Food Items, Furniture, Clothing, Electronics,
// Tools & Equipment, Automotive Parts, Books & Stationery).
const EXTRA_GOOD_TYPES: Array<{ nameEn: string; nameAr: string; canBurn?: boolean }> = [
  { nameEn: 'Machinery & Parts', nameAr: 'آلات وقطع صناعية' },
  { nameEn: 'Aluminium & Metals', nameAr: 'ألمنيوم ومعادن' },
  { nameEn: 'Plastic Goods', nameAr: 'مواد بلاستيكية', canBurn: true },
  { nameEn: 'Sports Equipment', nameAr: 'معدات رياضية' },
  { nameEn: 'Construction Materials', nameAr: 'مواد بناء' },
  { nameEn: 'Detergents & Cleaning', nameAr: 'مواد تنظيف', canBurn: true },
];

const REGULAR = 'REGULAR CUSTOMER — 250,000 CFA/m³';

const CLIENTS: RealClient[] = [
  {
    code: '1', name: 'ALI FARHAT', phone: '+24104050001', cbm: 2, kg: 285, expected: 550_000,
    items: [
      { gt: 'Sports Equipment', qty: 3, unit: 'Piece', note: 'TREADMILL — مكنة واحدة 3 قطع' },
      { gt: 'Tools & Equipment', qty: 3, unit: 'Crt', note: 'TOOLS — عدّة صناعيّة' },
      { gt: 'Clothing', qty: 1, unit: 'Piece', note: 'TRAVEL BAG — شنطة بلاستيك سوداء' },
    ],
  },
  {
    code: '2', name: 'FOUAD HAREB', phone: '+24102222261', cbm: 5.75, kg: 4722, expected: 2_125_000,
    remark: 'REGULAR CUSTOMER',
    overrides: [
      { type: 'RatePerKg', value: 450, reason: 'REGULAR CUSTOMER — 450,000 CFA/ton' },
      { type: 'TotalCharge', value: 2_125_000, reason: '+100 CFA fee — BOL 925' },
    ],
    items: [
      { gt: 'Machinery & Parts', qty: 2, unit: 'Piece', note: 'BULLDOZER TRACKS — جنزير' },
      { gt: 'Machinery & Parts', qty: 1, unit: 'Piece', note: 'EXCAVATOR TOWER PLATE — صفيحة برج حفّارة' },
      { gt: 'Machinery & Parts', qty: 2, unit: 'Piece', note: 'BULLDOZER MOTOR — موتير جرّافة' },
      { gt: 'Machinery & Parts', qty: 2, unit: 'Piece', note: 'BULLDOZER GEARBOX — كير جرّافة' },
    ],
  },
  {
    code: '3', name: 'NADIM NOUREDINE', phone: '+24177771717', cbm: 0.08, kg: 28, expected: 0,
    remark: 'PAID IN 825',
    overrides: [{ type: 'TotalCharge', value: 0, reason: 'PAID IN 825' }],
    items: [
      { gt: 'Books & Stationery', qty: 5, unit: 'Crt', note: 'PRICE TAGS — ورق تسعير بضاعة' },
      { gt: 'Books & Stationery', qty: 2, unit: 'Crt', note: 'DATE LABELLING GUN — مكنة تواريخ' },
    ],
  },
  {
    code: '4', name: 'ROUKOZ GHAWI', phone: '+9613744411', cbm: 2, kg: 599, expected: 550_000,
    items: [
      { gt: 'Aluminium & Metals', qty: 13, unit: 'Bundle', note: 'ALUMINIUM SHEET — الواح المنيوم' },
      { gt: 'Aluminium & Metals', qty: 20, unit: 'Crt', note: 'ALUMINIUM ACCESSORIES — اكسسوارات المنيوم' },
    ],
  },
  {
    code: '5', name: 'MAHER ZAWIL', phone: '+24106888800', cbm: 2.5, kg: 654, expected: 688_000,
    overrides: [{ type: 'TotalCharge', value: 688_000, reason: '+500 CFA fee — BOL 925' }],
    items: [
      { gt: 'Food Items', qty: 42, unit: 'Crt', note: 'CHOCOLATE — شوكولا' },
      { gt: 'Food Items', qty: 3, unit: 'Gallon', note: 'OIL — زيت مازولا' },
      { gt: 'Food Items', qty: 1, unit: 'Box', note: 'MOUNEH BOX — مونة، نسكافيه، كبيس، بهارات (30-line manifest)' },
      { gt: 'Detergents & Cleaning', qty: 7, unit: 'Crt', note: 'DETERGENT — مواد تنظيف' },
    ],
  },
  {
    code: '6', name: 'HUSSEIN ABDALLA', phone: '+24104530553', cbm: 1.5, kg: 597, expected: 375_000,
    remark: 'REGULAR CUSTOMER',
    overrides: [{ type: 'RatePerCbm', value: 250_000, reason: REGULAR }],
    items: [{ gt: 'Food Items', qty: 1, unit: 'Box', note: 'FOOD STUFF — 15 GALLON زيت، زيتون، شطة، مكدوس، ملوخية' }],
  },
  {
    code: '7', name: 'JACK DEMYAN', phone: '+24102262524', cbm: 3.5, kg: 1184, expected: 963_000,
    overrides: [{ type: 'TotalCharge', value: 963_000, reason: '+500 CFA fee — BOL 925' }],
    items: [
      { gt: 'Tools & Equipment', qty: 10, unit: 'Bag', note: 'POWDER GLUE — غراء بودرة' },
      { gt: 'Tools & Equipment', qty: 1, unit: 'Box', note: 'WOOD DRILLING MACHINE — مكنة حفر خشب' },
      { gt: 'Tools & Equipment', qty: 38, unit: 'Crt', note: 'ACCESSORIES — اكسسوارات' },
    ],
  },
  {
    code: '8', name: 'JAMAL JABER', phone: '+96171239673', cbm: 9.25, kg: 4318, expected: 2_312_000,
    remark: 'REGULAR CUSTOMER',
    overrides: [
      { type: 'RatePerCbm', value: 250_000, reason: REGULAR },
      { type: 'TotalCharge', value: 2_312_000, reason: '-500 CFA rounding — BOL 925' },
    ],
    items: [{ gt: 'Food Items', qty: 1, unit: 'Box', note: 'Assorted foodstuff & household goods (48-line manifest)' }],
  },
  {
    code: '10', name: 'MOHAMAD DAHER', phone: '+24162970871', cbm: 0.37, kg: 65, expected: 120_000,
    remark: 'CBM < 0.5 m³ — minimum freight 120,000 CFA',
    items: [
      { gt: 'Furniture', qty: 1, unit: 'Piece', note: 'TABLE — طاولة' },
      { gt: 'Furniture', qty: 6, unit: 'Crt', note: 'FURNITURE — عفش بيت' },
    ],
  },
  {
    code: '11', name: 'ALI RAMEZ GHANDOUR', phone: '+96171232323', cbm: 3, kg: 814, expected: 825_000,
    items: [{ gt: 'Tools & Equipment', qty: 16, unit: 'Crt', note: 'TOOLS — خردوات' }],
  },
  {
    code: '12', name: 'MOHAMAD AMMAR', phone: '+24107887788', cbm: 4, kg: 875, expected: 900_000,
    remark: 'REGULAR CUSTOMER',
    overrides: [{
      type: 'RatePerCbm', value: 225_000,
      reason: '2m³ PLASTIC CUPS @200,000 + 2m³ OTHER @250,000 — blended rate',
    }],
    items: [
      { gt: 'Plastic Goods', qty: 35, unit: 'Bag', note: 'PLASTIC CUPS — علب بلاستيك' },
      { gt: 'Tools & Equipment', qty: 22, unit: 'Crt', note: 'TOOLS — خردوات' },
      { gt: 'Automotive Parts', qty: 6, unit: 'Bag', note: 'CAR MATS — دعسات سيارة' },
    ],
  },
  {
    code: '13', name: 'GHASSAN GHANDOUR', phone: '+24106954223', cbm: 0.75, kg: 625, expected: 313_000,
    remark: 'Weight-priced: 0.625 t × 500,000 CFA/ton',
    overrides: [{ type: 'TotalCharge', value: 313_000, reason: '+500 CFA fee — BOL 925' }],
    items: [{ gt: 'Machinery & Parts', qty: 1, unit: 'Piece', note: 'HYDRAULIC PRESSURE PUMP — مضخّة هيدروليك للجرّافة' }],
  },
  {
    code: '14', name: 'MOHAMAD NASSAR', phone: '+24177220222', cbm: 1, kg: 463, expected: 275_000,
    items: [{ gt: 'Food Items', qty: 1, unit: 'Box', note: 'FOOD STUFF — مونة، فحم، رز، زيت زيتون' }],
  },
  {
    code: '15', name: 'AMIR CHMAYSANI', phone: '+24104776620', cbm: 0.15, kg: 60, expected: 120_000,
    remark: 'CBM < 0.5 m³ — minimum freight 120,000 CFA',
    items: [
      { gt: 'Food Items', qty: 1, unit: 'Crt', note: 'SPICES — بهارات' },
      { gt: 'Food Items', qty: 1, unit: 'Crt', note: 'SAMNEH — سمن بلدي' },
      { gt: 'Tools & Equipment', qty: 1, unit: 'Crt', note: 'HOSE — نباريش' },
    ],
  },
  {
    code: '16', name: 'HASSAN AWDE', phone: '+24162787843', cbm: 0.13, kg: 74, expected: 120_000,
    remark: 'CBM < 0.5 m³ — minimum freight 120,000 CFA',
    items: [{ gt: 'Food Items', qty: 1, unit: 'Box', note: 'FOOD STUFF — مونة' }],
  },
  {
    code: '17', name: 'HASSAN ISMAIL', phone: '+9613373573', cbm: 1.5, kg: 271, expected: 413_000,
    overrides: [{ type: 'TotalCharge', value: 413_000, reason: '+500 CFA fee — BOL 925' }],
    items: [{ gt: 'Clothing', qty: 12, unit: 'Crt', note: 'CLOTHES — ثياب' }],
  },
  {
    code: '18', name: 'GHAZI BDEIR', phone: '+24174444440', cbm: 0.07, kg: 37, expected: 120_000,
    remark: 'CBM < 0.5 m³ — minimum freight 120,000 CFA',
    items: [{ gt: 'Food Items', qty: 1, unit: 'Box', note: 'OLIVE OIL — زيت زيتون' }],
  },
  {
    code: '19&22', name: 'JAMAL HOUBBALLAH', phone: '+24160399999', cbm: 4.75, kg: 2016, expected: 1_376_000,
    remark: 'Two order forms combined (19 + 22)',
    overrides: [{
      type: 'TotalCharge', value: 1_376_000,
      reason: 'INCLUDING 70,000 CFA CUSTOMS DECLARATION PORT BEYRUTH',
    }],
    items: [
      { gt: 'Food Items', qty: 34, unit: 'Crt', note: 'SWEETS RAW MATERIAL — مواد اوّليّة للحلويات' },
      { gt: 'Plastic Goods', qty: 40, unit: 'Bag', note: 'CAKE BOXES — علب كاتو كرتون' },
      { gt: 'Plastic Goods', qty: 100, unit: 'Bag', note: 'CAKE MOLDS — قوالب كايك' },
    ],
  },
  {
    code: '20', name: 'ZEIN HRAYBI ZAYOUN', phone: '+24177191960', cbm: 0.12, kg: 30, expected: 120_000,
    remark: 'CBM < 0.5 m³ — minimum freight 120,000 CFA',
    items: [{ gt: 'Automotive Parts', qty: 1, unit: 'Piece', note: 'RADIATOR — رادياتير' }],
  },
  {
    code: '21', name: 'HASSAN CHAAYTO', phone: '+96171471717', cbm: 1, kg: 649, expected: 292_000,
    remark: 'Weight-priced at 450,000 CFA/ton',
    overrides: [
      { type: 'RatePerKg', value: 450, reason: 'Weight deal — 450,000 CFA/ton' },
      { type: 'TotalCharge', value: 292_000, reason: '-50 CFA rounding — BOL 925' },
    ],
    items: [
      { gt: 'Construction Materials', qty: 10, unit: 'Piece', note: 'CONCRETE BLOCK MOLD — قالب حجر باطون' },
      { gt: 'Construction Materials', qty: 1, unit: 'Piece', note: 'BLOCK PRESS — مكبس حجر باطون' },
      { gt: 'Construction Materials', qty: 10, unit: 'Piece', note: 'MOLD COVERS — غطاء قالب باطون' },
    ],
  },
  {
    code: '23', name: 'HAMZA HAYDAR', phone: '+24162455544', cbm: 7.75, kg: 814, expected: 1_938_000,
    remark: 'HIGH CBM — 1 m³ = 250,000 CFA',
    overrides: [
      { type: 'RatePerCbm', value: 250_000, reason: 'HIGH CBM — 1 m³ = 250,000 CFA' },
      { type: 'TotalCharge', value: 1_938_000, reason: '+500 CFA fee — BOL 925' },
    ],
    items: [
      { gt: 'Furniture', qty: 24, unit: 'Piece', note: 'WOOD CHAIR — كراسي خشب' },
      { gt: 'Furniture', qty: 4, unit: 'Crt', note: 'TABLE — طاولة' },
      { gt: 'Tools & Equipment', qty: 4, unit: 'Piece', note: 'FRIDGE — برّاد' },
      { gt: 'Electronics', qty: 1, unit: 'Piece', note: 'LED BILLBOARD — آرمة LED' },
    ],
  },
  {
    code: '24', name: 'GHASSAN KHADRA', phone: '+9613086518', cbm: 1.25, kg: 679, expected: 414_000,
    overrides: [{
      type: 'TotalCharge', value: 414_000,
      reason: 'INCLUDING 70,000 CFA CUSTOMS DECLARATION PORT BEYRUTH',
    }],
    items: [{ gt: 'Construction Materials', qty: 120, unit: 'Crt', note: 'SILICONE — سيليكون' }],
  },
  {
    code: '25', name: 'MOHAMAD HAREB', phone: '+24102060600', cbm: 0.34, kg: 54, expected: 120_000,
    remark: 'CBM < 0.5 m³ — minimum freight 120,000 CFA',
    items: [{ gt: 'Tools & Equipment', qty: 14, unit: 'Crt', note: 'KITCHEN EQUIPMENT — ادوات مطبخ (5 كراتين ملصقين ببعض)' }],
  },
  {
    code: '26', name: 'YOUSSEF MANSOUR', phone: '+24106340514', cbm: 5.25, kg: 2468, expected: 1_313_000,
    remark: 'REGULAR CUSTOMER',
    overrides: [
      { type: 'RatePerCbm', value: 250_000, reason: REGULAR },
      { type: 'TotalCharge', value: 1_313_000, reason: '+500 CFA fee — BOL 925' },
    ],
    items: [
      { gt: 'Tools & Equipment', qty: 41, unit: 'Piece', note: 'HOSE — نباريش' },
      { gt: 'Tools & Equipment', qty: 48, unit: 'Crt', note: 'HOSE ACCESSORIES — نباريش اكسسوارات' },
      { gt: 'Food Items', qty: 4, unit: 'Bag', note: 'COAL — فحم' },
    ],
  },
  {
    code: '27', name: 'MOHAMAD BITAR', phone: '+96181792583', cbm: 1, kg: 640, expected: 320_000,
    remark: 'Weight-priced: 0.640 t × 500,000 CFA/ton',
    items: [{ gt: 'Food Items', qty: 30, unit: 'Crt', note: 'CHOCOLATE DRAGÉES — ملبّس شوكولا' }],
  },
  {
    code: '28', name: 'ABBAS HIJAZI', phone: '+24106644300', cbm: 11.25, kg: 4943, expected: 2_813_000,
    remark: 'REGULAR CUSTOMER & HIGH CBM',
    overrides: [
      { type: 'RatePerCbm', value: 250_000, reason: 'REGULAR CUSTOMER & HIGH CBM — 250,000 CFA/m³' },
      { type: 'TotalCharge', value: 2_813_000, reason: '+500 CFA fee — BOL 925' },
    ],
    items: [
      { gt: 'Food Items', qty: 50, unit: 'Crt', note: 'COAL — فحم' },
      { gt: 'Food Items', qty: 41, unit: 'Crt', note: 'CHTOURA CANS — معلبات شتورا' },
      { gt: 'Food Items', qty: 45, unit: 'Crt', note: 'CHOCOLATE — شوكولا' },
      { gt: 'Food Items', qty: 3, unit: 'Box', note: 'FOOD STUFF TANKS — خزان (كبيس، حبوب، نسكافيه، عصير…)' },
    ],
  },
  {
    code: '29', name: 'IMAD NASSAR', phone: '+24162650000', cbm: 0.1, kg: 52, expected: 0,
    remark: 'FOR FREE — LOW CBM & WEIGHT — REGULAR CUSTOMER',
    overrides: [{ type: 'TotalCharge', value: 0, reason: 'FOR FREE — LOW CBM & WEIGHT — REGULAR CUSTOMER' }],
    items: [{ gt: 'Food Items', qty: 1, unit: 'Box', note: 'FOOD STUFF — مونة' }],
  },
  {
    code: '36', name: 'RACHID JABER', phone: '+24177727227', cbm: 5.01, kg: 554, expected: 0,
    overrides: [{ type: 'TotalCharge', value: 0, reason: 'No charge — BOL 925' }],
    items: [{ gt: 'Electronics', qty: 1, unit: 'Crt', note: 'ELECTRIC STUFF — 9KG/0.06m³ — عبدالله جابر' }],
  },
];

// Clients whose packages are created through the UI dialog (the rest go via
// API with their full item manifests): a plain-rate one, a minimum-charge one
// and a weight-priced regular.
const UI_CLIENTS = ['ALI FARHAT', 'MOHAMAD DAHER', 'FOUAD HAREB'];

// ── shared state (workers:1, serial describe) ────────────────────────────────
let token = '';
let shipmentId = 0;
let refCode = '';
const customerIds = new Map<string, number>(); // client name → customer id
const goodTypeIds = new Map<string, number>(); // nameEn → good type id
const packageIds = new Map<string, number>(); // client name → package id

const auth = () => ({ Authorization: `Bearer ${token}` });

function loadAdminToken(): string {
  const state = JSON.parse(fs.readFileSync(path.join('e2e', '.auth', 'admin.json'), 'utf-8'));
  const origin = (state.origins as Array<{ origin: string; localStorage: Array<{ name: string; value: string }> }>)
    .find((o) => o.origin.includes('5173'));
  const entry = origin?.localStorage.find((e) => e.name === 'token');
  if (!entry) throw new Error('admin token not found in e2e/.auth/admin.json');
  return entry.value;
}

async function getJson<T>(request: APIRequestContext, url: string): Promise<T> {
  const res = await request.get(`${API}${url}`, { headers: auth() });
  expect(res.ok(), `GET ${url} → ${res.status()}`).toBeTruthy();
  return (await res.json()) as T;
}

async function postJson<T>(request: APIRequestContext, url: string, data: unknown): Promise<T> {
  const res = await request.post(`${API}${url}`, { headers: auth(), data });
  expect(res.ok(), `POST ${url} → ${res.status()} ${await res.text()}`).toBeTruthy();
  return (await res.json().catch(() => ({}))) as T;
}

function packageNote(c: RealClient): string {
  return [`Order form ${c.code} — C91456\\925`, c.remark].filter(Boolean).join(' — ');
}

test.describe.serial('real shipment 925 (BEI → GAB) replay', () => {
  test.beforeAll(() => {
    token = loadAdminToken();
  });

  test('tariff: create + activate the real XAF config (275k/m³, 500/kg, min 120k)', async ({ page, request }) => {
    // Real manifest categories that aren't in the seed catalogue (idempotent).
    const existing = await getJson<Array<{ id: number; nameEn: string }>>(request, '/api/good-types');
    for (const gt of EXTRA_GOOD_TYPES) {
      const found = existing.find((g) => g.nameEn.toLowerCase() === gt.nameEn.toLowerCase());
      if (found) {
        goodTypeIds.set(gt.nameEn, found.id);
      } else {
        const created = await postJson<{ id: number }>(request, '/api/good-types', {
          nameEn: gt.nameEn, nameAr: gt.nameAr, canBreak: false, canBurn: gt.canBurn ?? false, isActive: true,
        });
        goodTypeIds.set(gt.nameEn, created.id);
      }
    }
    for (const g of existing) if (!goodTypeIds.has(g.nameEn)) goodTypeIds.set(g.nameEn, g.id);

    // The 925 tariff, created through the UI like an accountant would.
    const name = `Shipment 925 Tariff ${STAMP}`;
    await page.goto('/master/pricing-configs');
    await page.getByRole('button', { name: 'Create Config' }).click();
    await fillField(page, /^Name/, name);
    await pickSelect(page, 'Currency', /XAF/);
    await pickDate(page, /Effective From/);
    await fillField(page, 'Default Rate Per CBM', '275000');
    await fillField(page, 'Default Rate Per Kg', '500');
    await fillField(page, /Minimum Charge/, '120000');
    await submitForm(page);
    await expectToast(page, /created/i);

    const row = page.getByRole('row').filter({ hasText: name });
    await row.getByRole('button', { name: 'Activate' }).click();
    await expectToast(page, /activated/i);
    await expect(row.getByText('Active')).toBeVisible();
  });

  test('clients: find-or-create the 28 real customers', async ({ request }) => {
    const existing = await getJson<Array<{ id: number; name: string }>>(request, '/api/customers');
    const byName = new Map(existing.map((c) => [c.name.trim().toUpperCase(), c.id]));

    for (const c of CLIENTS) {
      const found = byName.get(c.name.toUpperCase());
      if (found) {
        customerIds.set(c.name, found); // customer already existed — reuse
        continue;
      }
      const created = await postJson<{ id: number }>(request, '/api/customers', {
        name: c.name,
        primaryPhone: c.phone,
        email: null,
        companyName: null,
        taxId: null,
        billingAddress: c.phone.startsWith('+241') ? 'Libreville, Gabon' : 'Beirut, Lebanon',
        isActive: true,
      });
      customerIds.set(c.name, created.id);
    }
    expect(customerIds.size).toBe(CLIENTS.length);
  });

  test('shipment: create BEI → GAB, container TIIU6591456, schedule', async ({ page, request }) => {
    await page.goto('/ops/shipments');
    await page.getByRole('button', { name: 'Create Shipment' }).click();
    await pickSelect(page, 'Origin Warehouse', /Beirut/);
    await pickSelect(page, 'Destination Warehouse', /Gabon/);
    // Real dates: EXW 19 Aug 2025 → POD 4 Nov 2025. Shifted to today for the test.
    await pickDate(page, /Planned Departure Date/);
    await pickDate(page, /Planned Arrival Date/);
    // 40ft container limits sized to the real load (75.37 m³ / 28.57 t).
    await fillField(page, /Max CBM/, '76');
    await fillField(page, /Max Weight/, '29000');
    await page.getByRole('dialog').getByRole('button', { name: 'Submit' }).click();
    await expectToast(page, /created/i);

    // Resolve OUR shipment by API — newest Draft on the BEI route. (On a serial
    // retry the previous attempt's Scheduled shipment still exists in the shared
    // backend, so "first BEI-* row" would be ambiguous.)
    const shipments = await getJson<Array<{ id: number; refCode: string; status: string }>>(
      request, '/api/shipments',
    );
    const mine = shipments
      .filter((s) => s.refCode.startsWith('BEI-') && s.status === 'Draft')
      .sort((a, b) => b.id - a.id)[0];
    expect(mine, 'freshly created BEI Draft shipment').toBeTruthy();
    shipmentId = mine.id;
    refCode = mine.refCode;
    await page.goto(`/ops/shipments/${shipmentId}`);
    await expect(page.getByText(refCode).first()).toBeVisible();

    await page.getByRole('button', { name: 'Edit Info' }).click();
    await fillField(page, 'TIIU Code', TIIU);
    await page.getByRole('dialog').getByRole('button', { name: 'Submit' }).click();
    await expectToast(page, /updated/i);
    // The drawer overlay must be gone before the header actions are clickable.
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByText(TIIU).first()).toBeVisible();

    await page.getByRole('button', { name: 'Schedule', exact: true }).click();
    await confirmDialog(page);
    await expectToast(page, /updated/i);
    await expect(page.getByText('Scheduled').first()).toBeVisible();
  });

  test('packages: three real clients through the UI dialog', async ({ page, request }) => {
    test.setTimeout(90_000);
    await page.goto(`/ops/shipments/${shipmentId}`);

    for (const name of UI_CLIENTS) {
      const c = CLIENTS.find((x) => x.name === name)!;
      await page.getByRole('button', { name: '+ Add Package' }).click();
      const dialog = page.getByRole('dialog');
      await pickSelect(page, 'Customer', new RegExp(c.name, 'i'));
      await fillField(page, /^CBM/, String(c.cbm));
      await fillField(page, /Weight \(kg\)/, String(c.kg));
      await fillField(page, 'Note', packageNote(c));
      await page.getByRole('combobox', { name: 'Good Type' }).first().click();
      const opt = page.getByRole('option', { name: c.items[0].gt }).first();
      await scrollOptionIntoView(opt);
      await opt.click();
      await dialog.getByRole('button', { name: 'Submit' }).click();
      await expectToast(page, /package created/i);
      await expect(dialog).not.toBeVisible();
    }

    // Map the UI-created packages to ids, then complete their item manifests.
    const detail = await getJson<{ packages: Array<{ id: number; customerName: string }> }>(
      request, `/api/shipments/${shipmentId}/detail`,
    );
    for (const p of detail.packages) packageIds.set(p.customerName.toUpperCase(), p.id);
    for (const name of UI_CLIENTS) {
      const c = CLIENTS.find((x) => x.name === name)!;
      const pkgId = packageIds.get(c.name)!;
      expect(pkgId).toBeTruthy();
      for (const item of c.items.slice(1)) {
        await postJson(request, `/api/packages/${pkgId}/items`, {
          goodTypeId: goodTypeIds.get(item.gt), quantity: item.qty, unit: item.unit, note: item.note,
        });
      }
    }
  });

  test('packages: remaining 25 clients via API with full item manifests', async ({ request }) => {
    for (const c of CLIENTS) {
      if (UI_CLIENTS.includes(c.name)) continue;
      const created = await postJson<{ id: number }>(request, `/api/shipments/${shipmentId}/packages`, {
        customerId: customerIds.get(c.name),
        provisionMethod: 'CustomerProvided',
        supplyOrderId: null,
        weightKg: c.kg,
        cbm: c.cbm,
        note: packageNote(c),
        items: c.items.map((i) => ({
          goodTypeId: goodTypeIds.get(i.gt), quantity: i.qty, unit: i.unit, note: i.note,
        })),
      });
      packageIds.set(c.name, created.id);
    }
    expect(packageIds.size).toBeGreaterThanOrEqual(CLIENTS.length);
  });

  test('pricing: replay the BOL overrides (regular rates, weight deals, fees, free)', async ({ request }) => {
    for (const c of CLIENTS) {
      for (const o of c.overrides ?? []) {
        await postJson(request, `/api/packages/${packageIds.get(c.name)}/pricing-override`, {
          overrideType: o.type, newValue: o.value, reason: o.reason,
        });
      }
    }
  });

  test('BOL parity: every charge matches, grand total 19,475,000 CFA, capacity 75.37 m³ / 28.570 t', async ({ page, request }) => {
    const detail = await getJson<{
      shipment: { totalCbm: number; totalWeightKg: number };
      packages: Array<{ id: number; customerName: string; chargeAmount: number; currency: string; cbm: number; weightKg: number }>;
    }>(request, `/api/shipments/${shipmentId}/detail`);

    expect(detail.packages.length).toBe(CLIENTS.length);
    let sum = 0;
    for (const c of CLIENTS) {
      const pkg = detail.packages.find((p) => p.customerName.toUpperCase() === c.name.toUpperCase())!;
      expect(pkg, `package for ${c.name}`).toBeTruthy();
      expect(pkg.currency, `${c.name} currency`).toBe('XAF');
      expect(Number(pkg.cbm), `${c.name} cbm`).toBeCloseTo(c.cbm, 3);
      expect(Number(pkg.weightKg), `${c.name} kg`).toBeCloseTo(c.kg, 3);
      expect(Number(pkg.chargeAmount), `${c.name} charge`).toBe(c.expected);
      sum += Number(pkg.chargeAmount);
    }
    expect(sum).toBe(GRAND_TOTAL_CFA);
    expect(Number(detail.shipment.totalCbm)).toBeCloseTo(TOTAL_CBM, 3);
    expect(Number(detail.shipment.totalWeightKg)).toBeCloseTo(TOTAL_KG, 3);

    // UI: capacity bars against the container limits + package count.
    await page.goto(`/ops/shipments/${shipmentId}`);
    await expect(page.getByText(/75\.37/).first()).toBeVisible();
    await expect(page.getByText(/28\.570/).first()).toBeVisible();
    await expect(page.getByText(/1–10 of 28/)).toBeVisible();

    // UI spot-checks (charges render on the Items & Pricing tab):
    // min-charge package + regular-customer override history.
    await page.goto(`/ops/packages/${packageIds.get('MOHAMAD DAHER')}`);
    await page.getByRole('tab', { name: 'Items & Pricing' }).click();
    await expect(page.getByText(/120,000/).first()).toBeVisible();

    await page.goto(`/ops/packages/${packageIds.get('ABBAS HIJAZI')}`);
    await page.getByRole('tab', { name: 'Items & Pricing' }).click();
    await expect(page.getByText(/2,813,000/).first()).toBeVisible();
    await expect(page.getByText(/REGULAR CUSTOMER & HIGH CBM — 250,000/).first()).toBeVisible();
  });

  test('lifecycle: bulk receive + pack all 28; ready-to-ship stays photo-gated', async ({ page, request }) => {
    const ids = CLIENTS.map((c) => packageIds.get(c.name)!);
    await postJson(request, `/api/shipments/${shipmentId}/packages/bulk-transition`, {
      packageIds: ids, action: 'receive',
    });
    await postJson(request, `/api/shipments/${shipmentId}/packages/bulk-transition`, {
      packageIds: ids, action: 'pack',
    });

    const detail = await getJson<{ packages: Array<{ status: string }> }>(request, `/api/shipments/${shipmentId}/detail`);
    for (const p of detail.packages) expect(p.status).toBe('Packed');

    // The real departure needed loading photos — without them the gate must hold.
    await page.goto(`/ops/shipments/${shipmentId}`);
    const table = page.getByRole('table').last();
    await table.getByRole('checkbox').first().check();
    await expect(page.getByText(/selected/).first()).toBeVisible();
    await page.getByRole('button', { name: 'Mark Ready to Ship' }).click();
    await confirmDialog(page);
    await expectToast(page, /receiving photo/i);
    await expect(table.getByText('Packed').first()).toBeVisible();
  });
});
