# LIEC Admin — `frontend-new/`

Fresh React + Vite + shadcn/ui rewrite of the LIEC admin app. The original `frontend/` (MUI) keeps running until this app reaches parity; then we cut over.

## Stack

| Layer | Pick | Why |
|---|---|---|
| Bundler | Vite + Rolldown | Default with Vite 8 |
| UI | shadcn/ui + Tailwind v4 | No double styling pipeline (no tss-react). CVA + `cn()` covers the makeStyles-style needs. |
| Forms | react-hook-form + zod, wrapped in a config-driven `DynamicFormWidget` | Same `Record<string, FieldConfig>` API as the original — port form configs unchanged. |
| Tables | Custom `EnhancedTable` over shadcn `<Table>` | Built-in sort/filter/pagination/selection; same column-type taxonomy as the original. |
| State | Redux Toolkit (`user`, `confirmation` slices only) | Same shape as the original. |
| Data fetch | `DataService` (raw fetch) + `useLoader` per resource + `useInitializeFunction` for first paint | No React Query. Each loader independently callable. |
| Toast | sonner | shadcn default. |
| Dates | date-fns | shadcn calendar uses it internally. |
| Phones | libphonenumber-js | Same parsing as before. |
| Icons | lucide-react | shadcn default. |

## Run

```bash
cd frontend-new
npm install
npm run dev        # http://localhost:5173
npm run build      # production build (typecheck + vite build)
```

Set `VITE_API_BASE_URL` if not using the Azure default baked into `main.tsx`.

## E2E tests (Playwright)

```bash
npm run test:e2e          # full suite, headless
npm run test:e2e:ui       # Playwright UI mode
npm run test:e2e:headed   # watch the browser
```

- **Fully isolated stack**: the config boots the backend with an empty MySql connection string,
  which flips it to the EF **InMemory** provider — fresh deterministic seed every run, zero
  Azure MySQL involvement. The Vite dev server is started automatically too.
- **Auth**: a `setup` project logs in once (admin) and provisions a Field user via API; all tests
  reuse saved `storageState` (`e2e/.auth/`, gitignored) — avoids the 10/min login rate limit.
- **Serial** (`workers: 1`): one shared backend instance holds state; specs run in order
  (alphabetical), and some specs rely on data created by earlier ones.
- **Projects**: `chromium` (desktop, everything) + `mobile` (Pixel 7, `@mobile`-tagged smoke:
  overflow checks, hamburger nav, full-screen dialogs).
- **`@external` tag**: tests touching Azure Blob / Twilio are excluded by default. Run them with
  `E2E_EXTERNAL=1 npx playwright test --grep @external`.
- **Photo-gated flows**: ready-to-ship/depart/handout require photos (Azure Blob), so the E2E
  suite asserts the *gates block* (receiving-photo error, ready-to-depart preview rejection)
  rather than the post-photo happy path.
- Backend must be **built** first (`dotnet build`) — the webServer uses `--no-build` for speed.

Coverage (60 tests): auth incl. malformed-token boot check · dashboard · navigation (launcher,
palette, nav scoping) · RBAC (Field redirects + hidden UI, admin surfaces) · master data CRUD
(warehouses, good types, suppliers, currencies incl. delete + conditional validation, customers +
consent) · pricing create/activate cascade · shipments create→schedule→packages→bulk ops→gates→
cancel · packages auto-assign→items→bulk add→transitions→pricing override · supply orders full
lifecycle + cancel-with-reason + pack-requires-link · users CRUD + self-role & last-admin guards ·
profile password change · communications pages · table search/sort/filter/pagination · mobile smoke.

## Folder map

```
src/
├── api/                   # DataService + parseApiError + JSON helpers
├── components/
│   ├── ui/                # shadcn primitives (managed by CLI — don't hand-edit)
│   ├── inputs/            # Generic* inputs (text, number, select, date, file, image, tags, etc.)
│   ├── dynamic-form/      # config-driven DynamicFormWidget (RHF + zod)
│   ├── enhanced-table/    # EnhancedTable with sort/filter/pagination
│   ├── information-widget/# read-only key-value grid for detail pages
│   ├── dialogs/           # GenericDialog, GenericDrawer, ConfirmationBox
│   ├── layout/            # Header, AppShell, MainPageTitle, MainPageSection, DetailPageLayout, RequireAuth
│   ├── feedback/          # Loader, EmptyState, LoadingButton, ErrorBoundary, TableSkeleton
│   └── misc/              # StatusBadge, Breadcrumbs
├── pages/                 # one folder per module — mirrors frontend/src/pages
├── redux/                 # user + confirmation slices
├── hooks/                 # useLoader, useInitializeFunction, useDebouncedValue, usePageTitle
├── helpers/               # rbac, formatting, validation, fx-rates, file-utils, audit-utils, format-price, user-token
├── constants/             # statusLabels, statusColors
├── theme/                 # globals.css (Tailwind + shadcn vars), tokens.ts (responsive spacing strings)
└── lib/utils.ts           # cn() helper
```

## The per-page recipe

Every page follows this pattern. See `WarehousesPage.tsx` for a working CRUD example, `DashboardPage.tsx` for read-only, `LoginPage.tsx` for a one-off form.

```tsx
export default function MyPage() {
  usePageTitle('My Page');

  // 1. One loader per resource — each can refresh independently.
  const items = useLoader(() => getJson<Item[]>('/api/items'));
  const lookup = useLoader(() => getJson<Lookup[]>('/api/lookup'));

  // 2. First paint loads everything in parallel.
  useInitializeFunction([items.reload, lookup.reload]);

  // 3. Mutations — call DataService, toast result, reload just that resource.
  const save = async (payload: unknown) => {
    try {
      await postJson('/api/items', payload);
      toast.success('Saved');
      await items.reload();
    } catch (e) {
      toast.error(parseApiError(e).message);
    }
  };

  return (
    <>
      <MainPageTitle title="Items" action={{ title: 'Create', onClick: openCreate }} />
      <div className="px-4 sm:px-6 pb-6">
        <EnhancedTable title="Items" header={...} data={...} />
      </div>
      <GenericDialog open={...} onClose={...} title="Create item">
        <DynamicFormWidget fields={buildFields(editing)} onSubmit={save} drawerMode />
      </GenericDialog>
    </>
  );
}
```

## Pages — port status

All 17 routes ported and wired in `App.tsx`. Production build clean (~273 KB gzipped, about half the original MUI bundle).

| Route | Source |
|---|---|
| `/login` | `frontend/src/pages/auth/LoginPage.tsx` |
| `/profile` | _new_ — header dropdown destination |
| `/ops/dashboard` | `frontend/src/pages/dashboard/DashboardPage.tsx` |
| `/ops/shipments` | `frontend/src/pages/shipments/ShipmentsPage.tsx` |
| `/ops/shipments/:id` | `frontend/src/pages/shipments/ShipmentDetailPage.tsx` |
| `/ops/packages` | `frontend/src/pages/packages/PackagesPage.tsx` |
| `/ops/packages/:id` | `frontend/src/pages/packages/PackageDetailPage.tsx` |
| `/master/customers` | `frontend/src/pages/customers/CustomersPage.tsx` |
| `/master/customers/:id` | `frontend/src/pages/customers/CustomerDetailPage.tsx` |
| `/master/warehouses` | `frontend/src/pages/warehouses/WarehousesPage.tsx` |
| `/master/good-types` | `frontend/src/pages/good-types/GoodTypesPage.tsx` |
| `/master/pricing-configs` | `frontend/src/pages/pricing/PricingConfigsPage.tsx` |
| `/master/suppliers` | `frontend/src/pages/suppliers/SuppliersPage.tsx` |
| `/master/supply-orders` | `frontend/src/pages/supply-orders/SupplyOrdersPage.tsx` |
| `/master/currencies` | `frontend/src/pages/currencies/CurrenciesPage.tsx` |
| `/comms/messaging-logs` | `frontend/src/pages/messaging/MessagingLogsPage.tsx` |
| `/comms/group-helper-export` | `frontend/src/pages/messaging/GroupHelperExportPage.tsx` |
| `/admin/users` | `frontend/src/pages/users/UsersPage.tsx` |

## Reference: MUI → shadcn mapping

Useful when porting future features against the old `frontend/`:

| Old (MUI) | New |
|---|---|
| `useQuery({...})` | `useLoader(() => getJson(...))` + add to `useInitializeFunction` |
| `useMutation({...})` | plain async function calling `postJson` / `putJson` / `patchJson` |
| `qc.invalidateQueries(...)` | `myLoader.reload()` |
| MUI `<TextField>` | `GenericInput` (text/email/url) or `GenericNumberInput` |
| MUI `<Select>` | `GenericSelect` (single) or `GenericMultiSelect` |
| MUI `<DatePicker>` | `GenericDatePicker` |
| MUI `<Dialog>` | `<GenericDialog>` |
| MUI `<Drawer anchor="right">` | `<GenericDrawer>` |
| Local confirm dialog | dispatch `OpenConfirmation({ title, message, destructive, onSubmit })` — `ConfirmationBox` is mounted globally |
| `toast.success/error` (react-toastify) | `toast.success/error` (sonner) — same API |
| `useNavigate()` / `<Navigate>` | unchanged (react-router-dom) |
| `BRAND_TEAL` `sx={{ color: ... }}` | inline `style={{ color: BRAND_TEAL }}` or shadcn `text-primary` |

`DynamicFormWidget` field configs (`DynamicField.TEXT`, etc.) are name-for-name compatible with the originals — copy the `buildFields(...)` function and adjust imports.

## Feature parity — complete

All features from the original MUI app are ported:

- **BulkAddItemsDialog** — PackageDetailPage → Items tab → "Bulk Add" (POST `/items/bulk`).
- **PackageDocuments** — PackageDetailPage → Photos tab (20 MB max, PDF/Word/Excel/PowerPoint).
- **Bulk package transitions** — ShipmentDetailPage packages table: select rows → action bar
  (ready-to-ship / arrive / handout / cancel), gated by `canBulkTransitionPackages`.
- **FxSnapshotsSection** — ShipmentDetailPage; manual rate override + removal (Admin/Manager).
- **CommandPalette** — Ctrl+K/⌘K or the header search icon; quick-nav to modules + live search
  of shipments, packages and customers (role-aware).
- **AppLauncher** — grid launcher via the header apps icon; role-filtered, searchable.

## Status (legacy `frontend/` was removed)

This is the sole frontend. RBAC is enforced at three layers: nav visibility (`application.ts`),
route guards (`RequireAuth` + `RequireModule` in `App.tsx`), and per-action `can*` checks —
mirroring the backend's `[Authorize(Roles=...)]` attributes. See `docs/ROLES_AND_PERMISSIONS.md`.
