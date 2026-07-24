import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ship, Package, Users, CornerDownLeft } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { getJson } from '@/api/client';
import { buildApplications } from '@/application';
import { useUserRole, canSee } from '@/helpers/rbac';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

interface ShipmentHit {
  id: number;
  refCode: string;
  status: string;
}
interface PackageHit {
  id: number;
  customerName?: string;
  status: string;
}
interface CustomerHit {
  id: number;
  name: string;
  primaryPhone: string;
}

// Global Ctrl+K search: quick-nav to modules + live lookup of shipments,
// packages and customers. Data loads lazily on first open and is cached for
// the session (palette reopen is instant).
export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const role = useUserRole();
  const [loaded, setLoaded] = useState(false);
  const [shipments, setShipments] = useState<ShipmentHit[]>([]);
  const [packages, setPackages] = useState<PackageHit[]>([]);
  const [customers, setCustomers] = useState<CustomerHit[]>([]);

  useEffect(() => {
    if (!open || loaded) return;
    (async () => {
      const results = await Promise.allSettled([
        getJson<ShipmentHit[]>('/api/shipments'),
        getJson<PackageHit[]>('/api/packages'),
        canSee(role, 'customers')
          ? getJson<CustomerHit[]>('/api/customers')
          : Promise.resolve([] as CustomerHit[]),
      ]);
      if (results[0].status === 'fulfilled') setShipments(results[0].value);
      if (results[1].status === 'fulfilled') setPackages(results[1].value);
      if (results[2].status === 'fulfilled') setCustomers(results[2].value);
      setLoaded(true);
    })();
  }, [open, loaded, role]);

  const groups = useMemo(() => buildApplications(role), [role]);

  const go = (route: string) => {
    navigate(route);
    onClose();
  };

  return (
    <CommandDialog open={open} onOpenChange={(v) => !v && onClose()}>
      <CommandInput placeholder="Search pages, shipments, packages, customers…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Go to">
          {groups.flatMap((g) =>
            g.modules.map((m) => {
              const Icon = m.icon;
              return (
                <CommandItem key={m.route} value={`${g.title} ${m.title}`} onSelect={() => go(m.route)}>
                  <Icon className="mr-2 size-4" />
                  {m.title}
                  <span className="ml-auto text-xs text-muted-foreground">{g.title}</span>
                </CommandItem>
              );
            }),
          )}
        </CommandGroup>

        {shipments.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Shipments">
              {shipments.slice(0, 50).map((s) => (
                <CommandItem
                  key={`s-${s.id}`}
                  value={`shipment ${s.refCode}`}
                  onSelect={() => go(`/ops/shipments/${s.id}`)}
                >
                  <Ship className="mr-2 size-4" />
                  {s.refCode}
                  <span className="ml-auto text-xs text-muted-foreground">{s.status}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {packages.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Packages">
              {packages.slice(0, 50).map((p) => (
                <CommandItem
                  key={`p-${p.id}`}
                  value={`package #${p.id} ${p.customerName ?? ''}`}
                  onSelect={() => go(`/ops/packages/${p.id}`)}
                >
                  <Package className="mr-2 size-4" />
                  Package #{p.id}
                  {p.customerName && (
                    <span className="ml-2 text-muted-foreground">— {p.customerName}</span>
                  )}
                  <span className="ml-auto text-xs text-muted-foreground">{p.status}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {customers.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Customers">
              {customers.slice(0, 50).map((c) => (
                <CommandItem
                  key={`c-${c.id}`}
                  value={`customer ${c.name} ${c.primaryPhone}`}
                  onSelect={() => go(`/master/customers/${c.id}`)}
                >
                  <Users className="mr-2 size-4" />
                  {c.name}
                  <span className="ml-auto text-xs text-muted-foreground">{c.primaryPhone}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
      <div className="border-t px-3 py-2 text-xs text-muted-foreground flex items-center gap-1">
        <CornerDownLeft className="size-3" /> to open · Esc to close
      </div>
    </CommandDialog>
  );
}
