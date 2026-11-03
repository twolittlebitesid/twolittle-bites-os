import { formatIDR, formatNumber } from '../domain/calculators';

export interface ChartPoint {
  label: string;
  value: number;
}

function shortDate(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value.slice(5);
  }
  return value;
}

export function LineChart({
  points,
  ariaLabel,
  currency = false
}: {
  points: ChartPoint[];
  ariaLabel: string;
  currency?: boolean;
}) {
  if (!points.length) {
    return <div className="chart-empty">Belum ada data tren pada periode ini.</div>;
  }

  const width = 680;
  const height = 220;
  const pad = { top: 18, right: 18, bottom: 34, left: 66 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  let min = Math.min(...points.map(p => p.value));
  let max = Math.max(...points.map(p => p.value));

  if (min === max) {
    if (max === 0) {
      max = 1;
    } else {
      min = Math.min(0, min * 0.9);
      max = max * 1.1;
    }
  } else {
    min = Math.min(0, min);
  }

  const xAt = (index: number) =>
    pad.left + (points.length === 1 ? chartW / 2 : (index / (points.length - 1)) * chartW);
  const yAt = (val: number) => pad.top + chartH - ((val - min) / (max - min)) * chartH;

  const formatVal = (v: number) => (currency ? formatIDR(v) : formatNumber(v, 1));

  const pathD = points
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${xAt(idx)} ${yAt(p.value)}`)
    .join(' ');

  const labelIndexes = Array.from(
    new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])
  ).filter(i => i >= 0);

  return (
    <div className="twb-chart">
      <svg viewBox={`0 0 ${width} ${height}`} className="twb-chart-svg" role="img" aria-label={ariaLabel}>
        {[0, 1, 2, 3, 4].map(i => {
          const ratio = i / 4;
          const val = max - ratio * (max - min);
          const y = pad.top + ratio * chartH;
          return (
            <g key={i}>
              <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} className="twb-chart-grid" />
              <text x={pad.left - 8} y={y + 4} textAnchor="end" className="twb-chart-axis-label">
                {formatVal(val)}
              </text>
            </g>
          );
        })}
        <path d={pathD} className="twb-chart-line" />
        {points.map((p, idx) => (
          <circle key={p.label + idx} cx={xAt(idx)} cy={yAt(p.value)} r={3.5} className="twb-chart-point">
            <title>{`${p.label}: ${formatVal(p.value)}`}</title>
          </circle>
        ))}
        {labelIndexes.map(idx => (
          <text
            key={idx}
            x={xAt(idx)}
            y={height - 10}
            textAnchor={idx === 0 ? 'start' : idx === points.length - 1 ? 'end' : 'middle'}
            className="twb-chart-axis-label"
          >
            {shortDate(points[idx].label)}
          </text>
        ))}
      </svg>
    </div>
  );
}

export function BarChart({
  points,
  currency = false
}: {
  points: ChartPoint[];
  currency?: boolean;
}) {
  if (!points.length) {
    return <div className="chart-empty">Belum ada data grafik.</div>;
  }
  const max = Math.max(1, ...points.map(p => p.value));
  const formatVal = (v: number) => (currency ? formatIDR(v) : formatNumber(v, 1));

  return (
    <div className="twb-chart">
      <div className="twb-bar-list">
        {points.slice(0, 12).map((point, idx) => (
          <div key={point.label + idx} className="twb-bar-row">
            <span className="twb-bar-label">{shortDate(point.label)}</span>
            <div className="twb-bar-track">
              <div
                className="twb-bar-fill"
                style={{ width: `${Math.max(2, (point.value / max) * 100)}%` }}
              />
            </div>
            <strong className="twb-bar-value">{formatVal(point.value)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const upper = String(status || '').toUpperCase();
  let tone = 'neutral';
  if (
    ['COMPLETED', 'PAID', 'ACTIVE', 'SUFFICIENT', 'RECEIVED', 'SUCCESS', 'HEALTHY', 'ON_TRACK', ' ACHIEVED', 'RELEASED', 'OPEN'].includes(upper)
  ) {
    tone = 'healthy';
  } else if (
    ['WAITING_PAYMENT', 'PARTIAL', 'SCHEDULED', 'IN_PRODUCTION', 'READY', 'ON_DELIVERY', 'ALMOST_FULL', 'LOW', 'ORDERED', 'DRAFT', 'SENT', 'PLANNED', 'IN_PROGRESS', 'AT_RISK'].includes(upper)
  ) {
    tone = 'attention';
  } else if (
    ['CANCELLED', 'OVERDUE', 'SHORTAGE', 'OUT_OF_STOCK', 'CRITICAL', 'FAILED', 'REFUND', 'REFUNDED', 'DORMANT', 'FULL', 'OFF_TRACK'].includes(upper)
  ) {
    tone = 'critical';
  }
  return <span className={`status-pill ${tone}`}>{upper}</span>;
}
