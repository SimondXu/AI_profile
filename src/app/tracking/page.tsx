import { TrackingDashboard } from "@/components/tracking/dashboard";
import { getAuthorizedDashboardData } from "@/lib/tracking/dal";
import { isTrackingEventType } from "@/lib/tracking/events";
import type { TrackingFilters, TrackingRange } from "@/lib/tracking/repository";

function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }

export default async function TrackingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const range = first(params.range);
  const eventType = first(params.event);
  const filters: TrackingFilters = {
    range: range === "24h" || range === "30d" || range === "90d" ? range : "7d" as TrackingRange,
    country: first(params.country) || undefined,
    network: first(params.network) || undefined,
    eventType: eventType && isTrackingEventType(eventType) ? eventType : "all",
    search: first(params.q)?.slice(0, 120) || undefined,
  };
  const data = await getAuthorizedDashboardData(filters);
  return <TrackingDashboard data={data} filters={filters} />;
}
