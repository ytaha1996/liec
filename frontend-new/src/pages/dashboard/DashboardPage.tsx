import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Camera } from 'lucide-react';
import { MainPageTitle } from '@/components/layout';
import { Loader, LoadFailed } from '@/components/feedback';
import { getJson } from '@/api/client';
import { useLoader } from '@/hooks/useLoader';
import { useInitializeFunction } from '@/hooks/useInitializeFunction';
import { usePageTitle } from '@/hooks/usePageTitle';
import {
  BRAND_TEAL,
  BRAND_NAVY,
  BRAND_PURPLE,
  SHIPMENT_STATUS_CHIPS,
  PKG_STATUS_CHIPS,
} from '@/constants/statusColors';
import { SHIPMENT_STATUS_LABELS, PKG_STATUS_LABELS } from '@/constants/statusLabels';

interface StatsOverview {
  totalCustomers?: number;
  shipmentsThisMonth?: number;
  shipmentsByStatus?: Record<string, number>;
  packagesByStatus?: Record<string, number>;
  packagesMissingDeparturePhotos?: number;
  packagesMissingArrivalPhotos?: number;
  totalPendingCharges?: number;
}

function StatCard({
  title,
  value,
  color = BRAND_TEAL,
  subtitle,
}: {
  title: string;
  value: string | number;
  color?: string;
  subtitle?: string;
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4 sm:p-6">
        <p className="text-xs sm:text-sm font-medium text-muted-foreground">{title}</p>
        <p
          className="font-bold leading-tight mt-1"
          style={{ color, fontSize: 'clamp(1.25rem, 4vw, 2rem)' }}
        >
          {value}
        </p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

function StatusBreakdown({
  title,
  data,
  chips,
  labels,
}: {
  title: string;
  data: Record<string, number>;
  chips: Record<string, { color: string; backgroundColor: string }>;
  labels: Record<string, string>;
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4 sm:p-6">
        <p className="text-sm font-medium text-muted-foreground mb-3">{title}</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(data).map(([k, count]) => (
            <Badge
              key={k}
              className="font-semibold"
              style={{
                color: chips[k]?.color ?? '#333',
                backgroundColor: chips[k]?.backgroundColor ?? '#e0e0e0',
              }}
            >
              {(labels[k] ?? k) + `: ${count}`}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  usePageTitle('Dashboard');
  const navigate = useNavigate();
  const stats = useLoader<StatsOverview>(() => getJson<StatsOverview>('/api/stats/overview'));
  const { initialized, error } = useInitializeFunction([stats.reload]);

  if (!initialized) return <Loader fullScreen />;
  if (error)
    return (
      <>
        <MainPageTitle title="Dashboard" subtitle="Operations overview" />
        <LoadFailed what="dashboard stats" onRetry={stats.reload} />
      </>
    );

  const s = stats.data ?? {};
  const shipmentsByStatus = s.shipmentsByStatus ?? {};
  const packagesByStatus = s.packagesByStatus ?? {};
  const activePending = (shipmentsByStatus.Draft ?? 0) + (shipmentsByStatus.Scheduled ?? 0);
  const totalShipments = Object.values(shipmentsByStatus).reduce((a, b) => a + b, 0);
  const totalPackages = Object.values(packagesByStatus).reduce((a, b) => a + b, 0);

  return (
    <>
      <MainPageTitle title="Dashboard" subtitle="Operations overview" />
      <div className="px-4 sm:px-6 pb-6 flex flex-col gap-4 sm:gap-6">
        {activePending < 2 && (
          <Alert>
            <AlertTriangle className="size-4" />
            <AlertDescription className="flex items-center justify-between gap-2 flex-wrap">
              <span>
                Only {activePending} active container(s) (Draft / Scheduled). At least 2
                recommended.
              </span>
              <Button size="sm" variant="outline" onClick={() => navigate('/ops/shipments')}>
                Create Shipment
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {((s.packagesMissingDeparturePhotos ?? 0) > 0 ||
          (s.packagesMissingArrivalPhotos ?? 0) > 0) && (
          <Alert>
            <Camera className="size-4" />
            <AlertDescription>
              {(s.packagesMissingDeparturePhotos ?? 0) > 0 && (
                <span>
                  {s.packagesMissingDeparturePhotos} package(s) missing departure photos.{' '}
                </span>
              )}
              {(s.packagesMissingArrivalPhotos ?? 0) > 0 && (
                <span>{s.packagesMissingArrivalPhotos} package(s) missing arrival photos.</span>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard title="Customers" value={s.totalCustomers ?? 0} color={BRAND_TEAL} />
          <StatCard
            title="Shipments"
            value={totalShipments}
            color={BRAND_NAVY}
            subtitle={`${s.shipmentsThisMonth ?? 0} this month`}
          />
          <StatCard title="Packages" value={totalPackages} color={BRAND_PURPLE} />
          {/* Backend omits the financial total for Field users — hide the card. */}
          {s.totalPendingCharges != null && (
            <StatCard
              title="Pending Charges"
              value={Number(s.totalPendingCharges).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
              color="#ed6c02"
              subtitle="active packages"
            />
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          <StatusBreakdown
            title="Shipments by Status"
            data={shipmentsByStatus}
            chips={SHIPMENT_STATUS_CHIPS}
            labels={SHIPMENT_STATUS_LABELS}
          />
          <StatusBreakdown
            title="Packages by Status"
            data={packagesByStatus}
            chips={PKG_STATUS_CHIPS}
            labels={PKG_STATUS_LABELS}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={() => navigate('/ops/shipments')}>View Shipments</Button>
          <Button variant="outline" onClick={() => navigate('/ops/packages')}>
            View Packages
          </Button>
        </div>
      </div>
    </>
  );
}
