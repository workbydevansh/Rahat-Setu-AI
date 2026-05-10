import { Badge } from "@/components/Badge";
import type { MapMarker } from "@/types";
import { cn, markerToneClasses } from "@/lib/utils";

interface MapPlaceholderProps {
  title: string;
  subtitle: string;
  markers: MapMarker[];
}

export function MapPlaceholder({
  title,
  subtitle,
  markers,
}: MapPlaceholderProps) {
  return (
    <section className="rounded-[32px] border border-border bg-surface p-6 shadow-[0_20px_44px_rgba(17,36,58,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-command-soft/70">
            Maps placeholder
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-command">{title}</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-command-soft/80">
            {subtitle}
          </p>
        </div>
        <Badge tone="neutral">LocationIQ slot</Badge>
      </div>

      <div className="relative mt-6 overflow-hidden rounded-[28px] border border-border bg-[linear-gradient(180deg,#17314c_0%,#13273b_100%)] p-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:48px_48px] opacity-40" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(47,143,131,0.18),transparent_28%),radial-gradient(circle_at_80%_28%,rgba(222,108,76,0.2),transparent_24%),radial-gradient(circle_at_54%_84%,rgba(216,163,69,0.16),transparent_24%)]" />
        <div className="relative h-72">
          {markers.map((marker) => (
            <div
              key={marker.label}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
            >
              <div
                className={cn(
                  "rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] shadow-[0_12px_24px_rgba(0,0,0,0.22)]",
                  markerToneClasses[marker.tone],
                )}
              >
                {marker.label}
              </div>
            </div>
          ))}
          <div className="absolute bottom-4 left-4 rounded-[20px] border border-white/10 bg-white/10 p-4 backdrop-blur">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/60">
              Graceful fallback
            </p>
            <p className="mt-2 max-w-xs text-sm leading-6 text-white/78">
              If no Maps API key is present, the app still renders a clear
              location overview using this command-center map board.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
