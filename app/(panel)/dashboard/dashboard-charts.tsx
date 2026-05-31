"use client";

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Wyraźnie odróżnialna paleta dla wykresu kołowego (poziomy opieki).
// Granat marki jako pierwszy, dalej kontrastowe barwy.
const PIE_PALETTE = [
  "#1e3a5f", // granat (marka)
  "#C9A84C", // złoty (marka)
  "#3b82f6", // niebieski
  "#10b981", // zielony
  "#ef4444", // czerwony
  "#8b5cf6", // fioletowy
  "#f97316", // pomarańczowy
  "#14b8a6", // morski
];

const TOOLTIP_STYLE = {
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  fontSize: 12,
} as const;

function pct(value: number, total: number): string {
  if (total <= 0) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

// ─── Lejek: wypełnione ankiety wg etapu kontaktu ──────────────────────────────

export type FunnelDatum = { name: string; value: number; fill: string };

export function FunnelChart({ data }: { data: FunnelDatum[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 48, left: 8, bottom: 0 }}
        >
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            axisLine={{ stroke: "#e2e8f0" }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={150}
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            axisLine={{ stroke: "#e2e8f0" }}
          />
          <Tooltip
            cursor={{ fill: "#f0f4f8" }}
            contentStyle={TOOLTIP_STYLE}
            labelStyle={{ color: "#1e3a5f", fontWeight: 600 }}
            formatter={(v) => [`${v} ankiet (${pct(Number(v), total)})`, ""]}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={28}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.fill} />
            ))}
            <LabelList
              dataKey="value"
              position="right"
              content={(props) => {
                const { x, y, width, height, value } = props as {
                  x: number;
                  y: number;
                  width: number;
                  height: number;
                  value: number;
                };
                if (value === 0) return null;
                return (
                  <text
                    x={x + width + 6}
                    y={y + height / 2}
                    fill="#1e3a5f"
                    fontSize={11}
                    fontWeight={600}
                    dominantBaseline="central"
                  >
                    {value} · {pct(value, total)}
                  </text>
                );
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Rozkład poziomów opieki (progi Barthela) ─────────────────────────────────

export type CareDatum = { name: string; value: number };

export function CareLevelChart({ data }: { data: CareDatum[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={85}
            paddingAngle={2}
            label={({ percent }) =>
              percent && percent > 0.04 ? `${Math.round(percent * 100)}%` : ""
            }
            labelLine={false}
            fontSize={11}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelStyle={{ color: "#1e3a5f", fontWeight: 600 }}
            formatter={(v, n) => [`${v} ankiet (${pct(Number(v), total)})`, n]}
          />
          <Legend
            iconType="circle"
            wrapperStyle={{ fontSize: 11, color: "#64748b" }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
