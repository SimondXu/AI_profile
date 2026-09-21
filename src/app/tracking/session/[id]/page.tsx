import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import { getAuthorizedSessionDetail } from "@/lib/tracking/dal";
import { TRACKING_EVENT_LABELS } from "@/lib/tracking/events";

const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC" });

function describeTarget(event: { event_type: string; target: string | null; detail: Record<string, unknown> | null }) {
  const detail = event.detail ?? {};
  if (event.event_type === "music_play" || event.event_type === "music_complete") {
    const title = typeof detail.title === "string" ? detail.title : event.target;
    const artist = typeof detail.artist === "string" ? ` — ${detail.artist}` : "";
    const source = typeof detail.source === "string" ? ` · ${detail.source}` : "";
    return `${title}${artist}${source}`;
  }
  if (event.event_type === "outbound_click") {
    const text = typeof detail.text === "string" && detail.text ? `${detail.text} → ` : "";
    return `${text}${event.target}`;
  }
  return event.target ?? "";
}

export default async function TrackingSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getAuthorizedSessionDetail(id);
  if (!detail) notFound();
  const { session, events } = detail;
  return <div className="tracking-shell tracking-detail-shell">
    <Link href="/tracking" className="tracking-back-link"><ArrowLeft size={16} strokeWidth={1.7} />All sessions</Link>
    <header className="tracking-header tracking-detail-header"><div><p className="tracking-eyebrow">SESSION DETAIL</p><h1>{session.ip}</h1><p>{session.country} · {session.network} · {session.device} · Times UTC</p></div><div className="tracking-detail-meta"><span>First seen</span><strong>{dateFormatter.format(session.firstSeenAt)}</strong><span>Last activity</span><strong>{dateFormatter.format(session.lastSeenAt)}</strong></div></header>
    <section className="tracking-detail-facts"><div><span>Network</span><strong>{session.network}</strong><small>{session.asn ?? "No ASN"}{session.domain ? ` · ${session.domain}` : ""}</small></div><div><span>Attribution confidence</span><strong>{session.confidence}</strong><small>Network attribution is an estimate, not an employer identity.</small></div><div><span>Country</span><strong>{session.country}</strong><small>{session.countryCode ?? "Unknown code"}</small></div></section>
    <section className="tracking-panel tracking-timeline"><div className="tracking-panel-head"><div><p className="tracking-section-label">TIMELINE</p><h2>Visit activity</h2></div><span>{events.length} events</span></div>{events.length ? <ol>{events.map((event) => <li key={event.id}><time>{dateFormatter.format(event.occurred_at)}</time><div><strong>{TRACKING_EVENT_LABELS[event.event_type] ?? event.event_type}</strong><p>{event.pathname}{event.referrer_host ? ` · from ${event.referrer_host}` : ""}</p>{event.target ? <p className="tracking-timeline-target">{describeTarget(event)}</p> : null}{event.prompt ? <blockquote>{event.prompt}</blockquote> : null}{event.utm_source || event.utm_medium || event.utm_campaign ? <small>Campaign: {[event.utm_source, event.utm_medium, event.utm_campaign].filter(Boolean).join(" / ")}</small> : null}</div><span className="tracking-timeline-icon"><ExternalLink size={14} strokeWidth={1.6} /></span></li>)}</ol> : <p className="tracking-empty">No events were retained for this session.</p>}</section>
  </div>;
}
