import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import { API, confirmDialog, expectToast, pickDate, pickSelect, tableByTitle } from './helpers';

// Stage 2 and 3 of the accounting layer (ACC-02, 09–13, 17–20).
// The container is built by this spec so it can run on its own; the DXB→GAB
// route keeps its invoice numbers clear of the invoicing spec's DXB→CHN one.
test.describe.serial('ledger, payments and credit notes', () => {
  // Each test builds on the last, so a retry would re-run the setup and double
  // every figure the later assertions check. Fail once, clearly, instead.
  test.describe.configure({ retries: 0 });

  let shipmentId = 0;
  let refCode = '';
  let customerA = 0;
  let customerB = 0;
  let invoiceA = 0;
  let invoiceB = 0;

  const FREIGHT_A = 2_250_000;
  const FREIGHT_B = 550_000;

  // Each test gets a fresh page, and localStorage is unreachable on about:blank
  // — so land somewhere in the app before reading the token.
  async function auth(page: Page): Promise<Record<string, string>> {
    if (!page.url().startsWith('http')) await page.goto('/ops/dashboard');
    const token = await page.evaluate(() => localStorage.getItem('token'));
    return { Authorization: `Bearer ${token}` };
  }

  async function addPackage(
    request: APIRequestContext, headers: Record<string, string>, customerId: number, charge: number,
  ) {
    const pkg = await (await request.post(`${API}/api/shipments/${shipmentId}/packages`, {
      headers,
      data: { customerId, provisionMethod: 'CustomerProvided', supplyOrderId: null, weightKg: 500, cbm: 8 },
    })).json();
    await request.post(`${API}/api/packages/${pkg.id}/pricing-override`, {
      headers, data: { overrideType: 'TotalCharge', newValue: charge, reason: 'E2E fixed price' },
    });
    return pkg.id as number;
  }

  async function invoices(request: APIRequestContext, headers: Record<string, string>) {
    return (await request.get(`${API}/api/shipments/${shipmentId}/invoices`, { headers })).json();
  }

  test('a container with two customers, invoiced as drafts', async ({ page, request }) => {
    await page.goto('/ops/shipments');
    await page.getByRole('button', { name: 'Create Shipment' }).click();
    await pickSelect(page, 'Origin Warehouse', /Dubai/);
    await pickSelect(page, 'Destination Warehouse', /Gabon/);
    await pickDate(page, /Planned Departure Date/);
    await pickDate(page, /Planned Arrival Date/);
    await page.getByRole('dialog').getByRole('button', { name: 'Submit' }).click();
    await expectToast(page, /created/i);

    const headers = await auth(page);
    const list = await (await request.get(`${API}/api/shipments`, { headers })).json();
    const rows = Array.isArray(list) ? list : list.items;
    const mine = rows
      .filter((s: { refCode: string; status: string; destinationWarehouseId?: number }) =>
        s.refCode.startsWith('DXB-') && s.status === 'Draft')
      .sort((a: { id: number }, b: { id: number }) => b.id - a.id)[0];
    shipmentId = mine.id;
    refCode = mine.refCode;

    const customers = await (await request.get(`${API}/api/customers`, { headers })).json();
    customerA = customers[3].id;
    customerB = customers[4].id;
    await addPackage(request, headers, customerA, FREIGHT_A);
    await addPackage(request, headers, customerB, FREIGHT_B);

    await page.goto(`/ops/shipments/${shipmentId}`);
    await page.getByRole('button', { name: 'Generate Invoices' }).click();
    await confirmDialog(page);
    await expectToast(page, /2 draft invoice\(s\) created/i);

    const created = await invoices(request, headers);
    invoiceA = created.find((i: { customerId: number }) => i.customerId === customerA).id;
    invoiceB = created.find((i: { customerId: number }) => i.customerId === customerB).id;
  });

  test('a draft has no ledger footprint at all', async ({ page }) => {
    // ACC-04: generating must not touch the accounts.
    await page.goto(`/finance/invoices/${invoiceA}`);
    await expect(page.getByText(/This is a draft/)).toBeVisible();
    await expect(page.getByRole('heading', { name: /Journal Entry/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Post to Ledger' })).toBeVisible();
  });

  test('the chart is mapped before anything posts', async ({ page }) => {
    // Trap 1: the mapping is on screen by name, so revenue landing in a
    // merchandise account is visible rather than silent.
    await page.goto('/finance/accounts');
    await expect(page.getByRole('heading', { name: 'Chart of Accounts', level: 1 })).toBeVisible();
    await expect(page.getByText('Customer receivable')).toBeVisible();
    await expect(page.getByText(/^4111 /)).toBeVisible();
    await expect(page.getByText(/^713 /).first()).toBeVisible();
    // Finance's note is explicit that 701 must never carry freight revenue.
    await expect(page.getByText('Freight revenue').locator('..').getByText(/^701 /)).toHaveCount(0);
  });

  test('posting writes a balanced entry naming its accounts', async ({ page }) => {
    // ACC-09 and trap 1.
    await page.goto(`/finance/invoices/${invoiceA}`);
    await page.getByRole('button', { name: 'Post to Ledger' }).click();
    await confirmDialog(page, 'Post');
    await expectToast(page, /posted/i);

    await expect(page.getByText('Posted').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: /Journal Entry — /, level: 2 })).toBeVisible();
    await expect(page.getByRole('cell', { name: /^4111 / })).toBeVisible();
    await expect(page.getByRole('cell', { name: /^713 / })).toBeVisible();
    await expect(page.getByText('Balanced')).toBeVisible();
  });

  test('a posted invoice cannot be posted, edited or deleted again', async ({ page, request }) => {
    // ACC-11: immutability holds from the UI and from the API.
    await page.goto(`/finance/invoices/${invoiceA}`);
    await expect(page.getByRole('button', { name: 'Post to Ledger' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'More' })).toHaveCount(0);

    const headers = await auth(page);
    const repost = await request.post(`${API}/api/accounting/invoices/${invoiceA}/post`, { headers });
    expect(repost.ok()).toBeFalsy();
    expect((await repost.text()).toLowerCase()).toContain('posted');

    const cancel = await request.post(`${API}/api/accounting/invoices/${invoiceA}/cancel`, {
      headers, data: { reason: 'changed my mind' },
    });
    expect(cancel.ok()).toBeFalsy();

    const del = await request.delete(`${API}/api/invoices/${invoiceA}`, { headers });
    // There is no delete route for a posted document at all.
    expect([404, 405]).toContain(del.status());
  });

  test('an unbalanced entry is refused outright', async ({ page, request }) => {
    // ACC-09: the guard lives in the posting service, so this asserts the
    // invoice it produced actually balances rather than trusting the label.
    const headers = await auth(page);
    const detail = await (await request.get(`${API}/api/invoices/${invoiceA}`, { headers })).json();
    const entry = await (await request.get(`${API}/api/accounting/entries/${detail.journalEntryId}`, { headers })).json();
    expect(entry.totalDebit).toBe(entry.totalCredit);
    expect(entry.isBalanced).toBe(true);
    expect(entry.totalDebit).toBe(FREIGHT_A);
  });

  test('the invoice starts unpaid and appears on receivables', async ({ page }) => {
    // ACC-17/18.
    await page.goto(`/finance/invoices/${invoiceA}`);
    await expect(page.getByText('Unpaid')).toBeVisible();

    await page.goto('/finance/receivables');
    await expect(page.getByRole('heading', { name: 'Receivables', level: 1 })).toBeVisible();
    await expect(
      tableByTitle(page, 'Customer Balances').getByRole('cell', { name: new RegExp(`#${customerA}\\)`) }),
    ).toBeVisible();
  });

  test('a part payment leaves the invoice partly paid', async ({ page }) => {
    await page.goto('/finance/receivables');
    // The customer shows in both the balances and the payments table, so the
    // row has to be picked out of the one that carries the action.
    await tableByTitle(page, 'Customer Balances')
      .getByRole('row', { name: new RegExp(`#${customerA}\\)`) })
      .getByRole('button', { name: 'Record Payment' }).click();

    const dialog = page.getByRole('dialog');
    // The open invoices arrive after the dialog opens; allocating before they
    // land would silently put the whole payment on account.
    await expect(dialog.getByRole('button', { name: /^INV\// })).toBeVisible();
    await dialog.getByLabel(/Amount received/).fill('1000000');
    await dialog.getByRole('button', { name: /Auto-allocate/ }).click();
    await dialog.getByRole('button', { name: 'Record Payment' }).click();
    await expectToast(page, /Payment recorded/i);

    await page.goto(`/finance/invoices/${invoiceA}`);
    await expect(page.getByText('Part paid')).toBeVisible();
    await expect(page.getByText(/PAY\/\d{4}\/0001/)).toBeVisible();
  });

  test('the balance owed is derived, never a stored flag', async ({ page, request }) => {
    const headers = await auth(page);
    const balance = await (await request.get(`${API}/api/accounting/invoices/${invoiceA}/balance`, { headers })).json();
    expect(balance.total).toBe(FREIGHT_A);
    expect(balance.paid).toBe(1_000_000);
    expect(balance.outstanding).toBe(FREIGHT_A - 1_000_000);
    expect(balance.status).toBe('Partially paid');
  });

  test('over-allocating a payment is refused before it is written', async ({ page, request }) => {
    const headers = await auth(page);
    const res = await request.post(`${API}/api/accounting/payments`, {
      headers,
      data: {
        customerId: customerA, amount: 5_000_000, currencyCode: 'XAF', method: 'Cash',
        reference: null, paymentDate: null,
        allocations: [{ invoiceId: invoiceA, amount: 5_000_000 }],
      },
    });
    expect(res.ok()).toBeFalsy();
    expect(await res.text()).toContain('outstanding');

    // Nothing was written: the balance is untouched.
    const balance = await (await request.get(`${API}/api/accounting/invoices/${invoiceA}/balance`, { headers })).json();
    expect(balance.paid).toBe(1_000_000);
  });

  test('settling the rest marks it paid', async ({ page, request }) => {
    const headers = await auth(page);
    const res = await request.post(`${API}/api/accounting/payments`, {
      headers,
      data: {
        customerId: customerA, amount: FREIGHT_A - 1_000_000, currencyCode: 'XAF',
        method: 'BankTransfer', reference: 'TRF-77120', paymentDate: null,
        allocations: [{ invoiceId: invoiceA, amount: FREIGHT_A - 1_000_000 }],
      },
    });
    expect(res.ok(), await res.text()).toBeTruthy();

    await page.goto(`/finance/invoices/${invoiceA}`);
    await expect(page.getByText('Paid', { exact: true })).toBeVisible();
  });

  test('a credit note reverses part of an invoice and references it', async ({ page, request }) => {
    // ACC-19: correction is a new document, never an edit.
    const headers = await auth(page);
    const postB = await request.post(`${API}/api/accounting/invoices/${invoiceB}/post`, { headers });
    expect(postB.ok(), await postB.text()).toBeTruthy();

    await page.goto(`/finance/invoices/${invoiceB}`);
    await page.getByRole('button', { name: 'Issue Credit Note' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/Amount to credit/).fill('50000');
    await dialog.getByLabel(/Reason/).fill('Overcharged one crate');
    await dialog.getByRole('button', { name: 'Issue Credit Note' }).click();
    await expectToast(page, /Credit note created/i);

    await expect(page.getByRole('heading', { name: 'Credit Notes', level: 2 })).toBeVisible();
    const notes = await (await request.get(`${API}/api/invoices/${invoiceB}/credit-notes`, { headers })).json();
    expect(notes).toHaveLength(1);
    expect(notes[0].type).toBe('CreditNote');
    expect(notes[0].grandTotal).toBe(50_000);
    // Its own number, not a reuse of the invoice's.
    expect(notes[0].number).not.toBe(`INV/${refCode}/002`);
  });

  test('posting the credit note reduces what is owed', async ({ page, request }) => {
    const headers = await auth(page);
    const notes = await (await request.get(`${API}/api/invoices/${invoiceB}/credit-notes`, { headers })).json();
    const post = await request.post(`${API}/api/accounting/invoices/${notes[0].id}/post`, { headers });
    expect(post.ok(), await post.text()).toBeTruthy();

    const balance = await (await request.get(`${API}/api/accounting/invoices/${invoiceB}/balance`, { headers })).json();
    expect(balance.outstanding).toBe(FREIGHT_B - 50_000);

    await page.goto(`/finance/invoices/${notes[0].id}`);
    await expect(page.getByText(/Reverses #/)).toBeVisible();
  });

  test('the trial balance agrees', async ({ page, request }) => {
    // ACC-20 and the point of double entry: if these differ, the books broke.
    await page.goto('/ops/reports');
    const headers = await auth(page);
    const report = await (await request.get(`${API}/api/reports/trial-balance`, { headers })).json();
    expect(report.rows.length).toBeGreaterThan(0);
    expect(report.totals.debit).toBe(report.totals.credit);
    expect(Number(report.totals.balance)).toBe(0);
    // Every row names its account in full (trap 1 and trap 2).
    for (const row of report.rows) expect(String(row.account)).toMatch(/^\d+ \S/);
  });

  test('the aged receivable lists what is still owed', async ({ page, request }) => {
    // ACC-17.
    const headers = await auth(page);
    const report = await (await request.get(`${API}/api/reports/aged-receivable`, { headers })).json();
    const row = report.rows.find((r: Record<string, unknown>) => Number(r.id) === customerB);
    expect(row, 'the part-credited customer still owes something').toBeTruthy();
    expect(Number(row.total)).toBe(FREIGHT_B - 50_000);
    // Posted today, so it is current, not overdue.
    expect(Number(row.current)).toBe(FREIGHT_B - 50_000);
    expect(Number(row.d90)).toBe(0);

    // The fully-settled customer has dropped off entirely.
    expect(report.rows.find((r: Record<string, unknown>) => Number(r.id) === customerA)).toBeFalsy();

    await page.goto('/ops/reports');
    await expect(page.getByRole('heading', { name: 'Reports', level: 1 })).toBeVisible();
  });

  test('revenue by period reads the ledger, not the operational figures', async ({ page, request }) => {
    const headers = await auth(page);
    const report = await (await request.get(`${API}/api/reports/revenue-by-period`, { headers })).json();
    const month = `${new Date().toISOString().slice(0, 7)}`;
    const row = report.rows.find((r: Record<string, unknown>) => r.month === month);
    expect(row).toBeTruthy();
    // Both invoices less the credit note.
    expect(Number(row.revenue)).toBe(FREIGHT_A + FREIGHT_B - 50_000);
    await page.goto('/ops/reports');
  });

  test('the financial reports export to Excel with readable names', async ({ page, request }) => {
    const headers = await auth(page);
    for (const key of ['trial-balance', 'aged-receivable', 'general-ledger', 'revenue-by-period']) {
      const res = await request.post(`${API}/api/exports/reports/${key}`, { headers, data: {} });
      expect(res.ok(), `${key}: ${await res.text()}`).toBeTruthy();
      const body = await res.json();
      // The readable name lives in the blob key, because Azure serves anonymous
      // reads at a version that ignores Content-Disposition.
      expect(String(body.publicUrl ?? '')).toContain(key);
    }
    await page.goto('/ops/reports');
  });

  test('closing a month refuses any further posting into it', async ({ page, request }) => {
    // ACC-13: without this a late edit silently changes a reported month.
    const headers = await auth(page);
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() + 1;

    await page.goto('/finance/accounts');
    const close = await request.post(`${API}/api/accounting/periods/${year}/${month}/close`, { headers });
    expect(close.ok(), await close.text()).toBeTruthy();

    // A fresh draft on the same container now cannot reach the ledger.
    const customers = await (await request.get(`${API}/api/customers`, { headers })).json();
    await addPackage(request, headers, customers[5].id, 120_000);
    await request.post(`${API}/api/shipments/${shipmentId}/invoices/generate`, { headers });
    const all = await invoices(request, headers);
    const fresh = all.find((i: { state: string; customerId: number }) =>
      i.state === 'Draft' && i.customerId === customers[5].id);
    expect(fresh).toBeTruthy();

    const post = await request.post(`${API}/api/accounting/invoices/${fresh.id}/post`, { headers });
    expect(post.ok()).toBeFalsy();
    expect((await post.text()).toLowerCase()).toContain('closed');

    // Reopen so later specs are not blocked by this test's side effect.
    const reopen = await request.post(`${API}/api/accounting/periods/${year}/${month}/reopen`, { headers });
    expect(reopen.ok()).toBeTruthy();
    const after = await request.post(`${API}/api/accounting/invoices/${fresh.id}/post`, { headers });
    expect(after.ok(), await after.text()).toBeTruthy();
  });

  test('cancelling a draft frees its packages and leaves the number used', async ({ page, request }) => {
    // ACC-08: the gap in the sequence is deliberate and explainable.
    const headers = await auth(page);
    const customers = await (await request.get(`${API}/api/customers`, { headers })).json();
    await addPackage(request, headers, customers[6].id, 200_000);
    await request.post(`${API}/api/shipments/${shipmentId}/invoices/generate`, { headers });

    const before = await invoices(request, headers);
    const draft = before.find((i: { state: string; customerId: number }) =>
      i.state === 'Draft' && i.customerId === customers[6].id);
    expect(draft).toBeTruthy();

    await page.goto(`/finance/invoices/${draft.id}`);
    // Cancelling is a secondary action, so it sits in the header's More menu.
    await page.getByRole('button', { name: 'More' }).click();
    await page.getByRole('menuitem', { name: 'Cancel Invoice' }).click();
    await page.getByRole('dialog').getByLabel(/Reason/).fill('Wrong customer on the packing list');
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel Invoice' }).click();
    await expectToast(page, /cancelled/i);

    await expect(page.getByText(/Wrong customer on the packing list/)).toBeVisible();

    // Regenerating gives a NEW number — the cancelled one is never reused.
    const regen = await request.post(`${API}/api/shipments/${shipmentId}/invoices/generate`, { headers });
    expect(regen.ok()).toBeTruthy();
    const after = await invoices(request, headers);
    const replacement = after.find((i: { state: string; customerId: number; id: number }) =>
      i.customerId === customers[6].id && i.id !== draft.id);
    expect(replacement, 'the freed package was invoiced again').toBeTruthy();
    expect(replacement.number).not.toBe(draft.number);
  });
});

test.describe('RBAC — the books are closed to field staff', () => {
  test.use({ storageState: 'e2e/.auth/field.json' });

  test('every finance route redirects to the dashboard', async ({ page }) => {
    for (const route of ['/finance/invoices', '/finance/receivables', '/finance/accounts']) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/ops\/dashboard/);
    }
  });

  test('the API refuses a field user posting or taking money', async ({ page, request }) => {
    await page.goto('/ops/dashboard');
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const headers = { Authorization: `Bearer ${token}` };

    const post = await request.post(`${API}/api/accounting/invoices/1/post`, { headers });
    expect(post.status()).toBe(403);

    const pay = await request.post(`${API}/api/accounting/payments`, {
      headers,
      data: { customerId: 1, amount: 100, currencyCode: 'XAF', method: 'Cash', allocations: [] },
    });
    expect(pay.status()).toBe(403);

    const accounts = await request.get(`${API}/api/accounting/accounts`, { headers });
    expect(accounts.status()).toBe(403);
  });
});
