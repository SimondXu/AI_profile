import Link from "next/link";
import { Activity, ArrowUpRight, Disc3, ExternalLink, Globe2, LogOut, MessageSquareText, MousePointer2, Users } from "lucide-react";
import { logoutTracking } from "@/app/tracking/actions";
import type { TrackingFilters } from "@/lib/tracking/repository";

type DashboardData = Awaited<ReturnType<typeof import("@/lib/tracking/repository").getDashboardData>>;

const numberFormatter = new Intl.NumberFormat("en-US");
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  timeZone: "UTC",
});

function formatNumber(value: number) {
  return numberFormatter.format(value);
}

function formatDate(value: number) {
  return dateFormatter.format(value);
}

function MetricCard({ label, value, detail, icon: Icon }: { label: string; value: number | string; detail: string; icon: typeof Activity }) {
  return (
    <article className="tracking-metric">
      <div className="tracking-metric-label"><Icon size={15} strokeWidth={1.7} />{label}</div>
      <strong>{typeof value === "number" ? formatNumber(value) : value}</strong>
      <span>{detail}</span>
    </article>
  );
}

function TrendChart({ daily }: { daily: DashboardData["daily"] }) {
  if (!daily.length) return <div className="tracking-empty-chart">Activity will appear here after the first visit.</div>;
  const max = Math.max(1, ...daily.flatMap((item) => [item.pageViews, item.prompts, item.downloads]));
  const width = 760;
  const height = 188;
  const step = daily.length > 1 ? width / (daily.length - 1) : width;
  const points = (key: "pageViews" | "prompts" | "downloads") => daily.map((item, index) => `${index * step},${height - (item[key] / max) * 146 - 18}`).join(" ");
  return (
    <div className="tracking-chart-wrap" role="img" aria-label="Daily page views, prompts, and resume downloads trend">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="tracking-chart">
        <line x1="0" x2={width} y1="170" y2="170" className="tracking-chart-rule" />
        <line x1="0" x2={width} y1="96" y2="96" className="tracking-chart-rule" />
        <polyline points={points("pageViews")} className="tracking-chart-page" />
        <polyline points={points("prompts")} className="tracking-chart-prompt" />
        <polyline points={points("downloads")} className="tracking-chart-download" />
      </svg>
      <div className="tracking-chart-legend"><span><i className="tracking-key tracking-key-page" />Page views</span><span><i className="tracking-key tracking-key-prompt" />Prompts</span><span><i className="tracking-key tracking-key-download" />Downloads</span></div>
      <div className="tracking-chart-labels"><span>{daily[0]?.day}</span><span>{daily.at(-1)?.day}</span></div>
    </div>
  );
}

function DistributionList({ items, label }: { items: { label: string; count: number }[]; label: string }) {
  const max = Math.max(1, ...items.map((item) => item.count));
  if (!items.length) return <p className="tracking-empty">No {label.toLocaleLowerCase()} for this range.</p>;
  return <div className="tracking-distribution-list">
    {items.map((item) => <div className="tracking-distribution" key={item.label}>
      <div><span title={item.label}>{item.label}</span><b>{formatNumber(item.count)}</b></div>
      <div className="tracking-bar"><i style={{ width: `${(item.count / max) * 100}%` }} /></div>
    </div>)}
  </div>;
}

function FilterBar({ filters, countries, networks }: { filters: TrackingFilters; countries: DashboardData["countries"]; networks: DashboardData["networks"] }) {
  return <form className="tracking-filters" action="/tracking">
    <label>Range<select name="range" defaultValue={filters.range}><option value="24h">24 hours</option><option value="7d">7 days</option><option value="30d">30 days</option><option value="90d">90 days</option></select></label>
    <label>Country<select name="country" defaultValue={filters.country ?? ""}><option value="">All countries</option>{countries.filter((item) => item.code).map((item) => <option key={item.code} value={item.code ?? ""}>{item.label}</option>)}</select></label>
    <label>Network<select name="network" defaultValue={filters.network ?? ""}><option value="">All networks</option>{networks.filter((item) => item.domain).map((item) => <option key={item.domain} value={item.domain ?? ""}>{item.label}</option>)}</select></label>
    <label>Activity<select name="event" defaultValue={filters.eventType ?? "all"}><option value="all">All activity</option><option value="page_view">Page views</option><option value="chat_prompt">Prompts</option><option value="resume_download">Resume downloads</option><option value="music_play">Music plays</option><option value="music_complete">Music completes</option><option value="outbound_click">Outbound clicks</option></select></label>
    <label className="tracking-filter-search">Question search<input name="q" defaultValue={filters.search ?? ""} placeholder="Search decrypted prompts" maxLength={120} /></label>
    <button type="submit" className="tracking-filter-button">Apply</button>
  </form>;
}

export function TrackingDashboard({ data, filters }: { data: DashboardData; filters: TrackingFilters }) {
  return <div className="tracking-shell">
    <header className="tracking-header">
      <div><p className="tracking-eyebrow">PRIVATE ANALYTICS</p><h1>Visitor activity</h1><p>Traffic, questions, and network attribution. Times are UTC; network data is estimated from IP ASN records.</p></div>
      <form action={logoutTracking}><button className="tracking-logout" type="submit"><LogOut size={15} strokeWidth={1.7} />Sign out</button></form>
    </header>
    <FilterBar filters={filters} countries={data.countries} networks={data.networks} />
    <section className="tracking-metrics" aria-label="Key metrics">
      <MetricCard label="Page views" value={data.kpis.pageViews} detail="Tracked routes" icon={MousePointer2} />
      <MetricCard label="Sessions" value={data.kpis.uniqueSessions} detail={`${formatNumber(data.kpis.uniqueIps)} unique IPs`} icon={Users} />
      <MetricCard label="Chat sessions" value={data.kpis.chatSessions} detail={`${data.kpis.chatUseRate}% of sessions`} icon={MessageSquareText} />
      <MetricCard label="Questions" value={data.kpis.promptCount} detail="User prompts only" icon={Activity} />
      <MetricCard label="Music plays" value={data.kpis.playCount} detail={`${data.kpis.musicUseRate}% of sessions · ${formatNumber(data.kpis.completeCount)} finished`} icon={Disc3} />
      <MetricCard label="Outbound clicks" value={data.kpis.clickCount} detail="Links leaving the site" icon={ExternalLink} />
    </section>
    <section className="tracking-panel tracking-trend-panel">
      <div className="tracking-panel-head"><div><p className="tracking-section-label">VOLUME</p><h2>Activity trend</h2></div><span>{filters.range}</span></div>
      <TrendChart daily={data.daily} />
    </section>
    <section className="tracking-grid-two">
      <section className="tracking-panel"><div className="tracking-panel-head"><div><p className="tracking-section-label">CONTENT</p><h2>Top pages</h2></div></div><DistributionList items={data.topPages} label="page views" /></section>
      <section className="tracking-panel"><div className="tracking-panel-head"><div><p className="tracking-section-label">ACQUISITION</p><h2>Sources</h2></div></div><DistributionList items={data.sources} label="sources" /></section>
      <section className="tracking-panel"><div className="tracking-panel-head"><div><p className="tracking-section-label">LOCATION</p><h2>Countries</h2></div><Globe2 size={16} strokeWidth={1.6} /></div><DistributionList items={data.countries} label="countries" /></section>
      <section className="tracking-panel"><div className="tracking-panel-head"><div><p className="tracking-section-label">NETWORK</p><h2>Possible organizations</h2></div><span className="tracking-estimate">Estimated</span></div><DistributionList items={data.networks} label="networks" /></section>
      <section className="tracking-panel"><div className="tracking-panel-head"><div><p className="tracking-section-label">MUSIC</p><h2>Top records</h2></div><span>Plays · finished</span></div><DistributionList items={data.topTracks.map((track) => ({ label: `${track.label} (${track.completes} finished)`, count: track.count }))} label="plays" /></section>
      <section className="tracking-panel"><div className="tracking-panel-head"><div><p className="tracking-section-label">EXIT</p><h2>Outbound links</h2></div></div><DistributionList items={data.topLinks} label="outbound clicks" /></section>
    </section>
    <section className="tracking-panel tracking-table-panel">
      <div className="tracking-panel-head"><div><p className="tracking-section-label">VISITORS</p><h2>Recent sessions</h2></div><span>{formatNumber(data.sessions.length)} shown</span></div>
      {data.sessions.length ? <div className="tracking-table-scroll"><table><thead><tr><th>Visitor</th><th>Location / network</th><th>Device</th><th>Last activity</th><th>Views</th><th>Prompts</th><th>Downloads</th><th>Plays</th><th>Clicks</th><th><span className="sr-only">Detail</span></th></tr></thead><tbody>{data.sessions.map((session) => <tr key={session.id}><td><strong>{session.ip}</strong><small>First {formatDate(session.firstSeenAt)}</small></td><td><strong>{session.country}</strong><small>{session.network}</small></td><td>{session.device}</td><td>{formatDate(session.lastSeenAt)}</td><td>{session.pages}</td><td>{session.prompts}</td><td>{session.downloads}</td><td>{session.plays}</td><td>{session.clicks}</td><td><Link href={`/tracking/session/${session.id}`} className="tracking-detail-link" aria-label={`Open details for ${session.ip}`}><ArrowUpRight size={16} strokeWidth={1.7} /></Link></td></tr>)}</tbody></table></div> : <p className="tracking-empty">No visitor sessions match these filters.</p>}
    </section>
    <section className="tracking-panel tracking-table-panel">
      <div className="tracking-panel-head"><div><p className="tracking-section-label">CONVERSATION</p><h2>Questions</h2></div><span>User input only</span></div>
      {data.prompts.length ? <div className="tracking-table-scroll"><table><thead><tr><th>Time</th><th>Visitor</th><th>Network</th><th>Page</th><th>Question</th></tr></thead><tbody>{data.prompts.map((prompt) => <tr key={prompt.id}><td>{formatDate(prompt.occurredAt)}</td><td>{prompt.ip}</td><td>{prompt.network}</td><td>{prompt.pathname}</td><td className="tracking-prompt-cell">{prompt.prompt}</td></tr>)}</tbody></table></div> : <p className="tracking-empty">No questions match these filters.</p>}
    </section>
    <section className="tracking-panel tracking-table-panel">
      <div className="tracking-panel-head"><div><p className="tracking-section-label">RESUME</p><h2>Downloads</h2></div><span>{formatNumber(data.kpis.downloadCount)} total</span></div>
      {data.downloads.length ? <div className="tracking-table-scroll"><table><thead><tr><th>Time</th><th>Visitor</th><th>Location / network</th><th>Source page</th><th>Device</th></tr></thead><tbody>{data.downloads.map((download) => <tr key={download.id}><td>{formatDate(download.occurredAt)}</td><td>{download.ip}</td><td><strong>{download.country}</strong><small>{download.network}</small></td><td>{download.pathname}</td><td>{download.device}</td></tr>)}</tbody></table></div> : <p className="tracking-empty">No resume downloads match these filters.</p>}
    </section>
  </div>;
}
