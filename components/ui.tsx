import { formatCents, formatCentsSigned } from "@/lib/core/money";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-ink-2">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Money({
  cents,
  tone = "auto",
  signed = false,
  className = "",
}: {
  cents: number;
  // auto: green when positive, red when negative, muted at zero
  tone?: "auto" | "pos" | "neg" | "plain" | "muted";
  signed?: boolean;
  className?: string;
}) {
  const resolved =
    tone === "auto" ? (cents > 0 ? "pos" : cents < 0 ? "neg" : "muted") : tone;
  const color =
    resolved === "pos"
      ? "text-pos"
      : resolved === "neg"
        ? "text-neg"
        : resolved === "muted"
          ? "text-ink-3"
          : "text-ink";
  return (
    <span className={`font-semibold tabular-nums ${color} ${className}`}>
      {signed ? formatCentsSigned(cents) : formatCents(cents)}
    </span>
  );
}

export function Pill({
  tone,
  children,
}: {
  tone: "pos" | "warn" | "neg" | "info" | "muted";
  children: React.ReactNode;
}) {
  const styles = {
    pos: "bg-forest/25 text-lime",
    warn: "bg-warn/15 text-warn",
    neg: "bg-neg/15 text-neg",
    info: "bg-info/15 text-info",
    muted: "bg-surface-2 text-ink-2",
  }[tone];
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${styles}`}>
      {children}
    </span>
  );
}

export function ProgressBar({
  fraction,
  className = "",
}: {
  fraction: number;
  className?: string;
}) {
  const pct = Math.min(100, Math.max(0, fraction * 100));
  return (
    <div className={`h-1.5 overflow-hidden rounded-full bg-surface-2 ${className}`}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-forest to-accent"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Donut({
  fraction,
  label,
  sublabel,
  size = 150,
}: {
  fraction: number;
  label: string;
  sublabel: string;
  size?: number;
}) {
  const clamped = Math.min(1, Math.max(0, fraction));
  const stroke = 13;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label} ${sublabel}`}>
      <defs>
        <linearGradient id="donut-grad" x1="0" y1="1" x2="1" y2="0">
          <stop stopColor="#1E7A3C" />
          <stop offset="1" stopColor="#C6FF5E" />
        </linearGradient>
      </defs>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--surface-2)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="url(#donut-grad)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${c * clamped} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="47%"
        textAnchor="middle"
        className="fill-ink"
        style={{ fontSize: 26, fontWeight: 700 }}
      >
        {label}
      </text>
      <text
        x="50%"
        y="61%"
        textAnchor="middle"
        className="fill-ink-3"
        style={{ fontSize: 10.5 }}
      >
        {sublabel}
      </text>
    </svg>
  );
}

export function LegendDot({ color }: { color: string }) {
  return (
    <span
      className="inline-block h-2.5 w-2.5 rounded-full"
      style={{ background: color }}
    />
  );
}
