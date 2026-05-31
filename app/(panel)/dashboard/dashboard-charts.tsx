"use client";

import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Paleta zgodna z --chart-1..5 z globals.css
const PALETTE = ["#1e3a5f", "#C9A84C", "#2a4f82", "#d9bb70", "#152b47", "#94a3b8"];

const TOOLTIP_STYLE = {
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  fontSize: 12,
} as const;

// ─── Lejek: wypełnione ankiety wg etapu kontaktu ──────────────────────────────

export type FunnelDatum = { name: string; value: number; fill: string };

export function FunnelChart({ data }: { data: FunnelDatum[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 16, left: 8, bottom: 0 }}
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
            formatter={(v) => [`${v} ankiet`, ""]}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={28}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Rozkład poziomów opieki (progi Barthela) ─────────────────────────────────

export type CareDatum = { name: string; value: number };

export function CareLevelChart({ data }: { data: CareDatum[] }) {
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
          >
            {data.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelStyle={{ color: "#1e3a5f", fontWeight: 600 }}
            formatter={(v, n) => [`${v} ankiet`, n]}
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
