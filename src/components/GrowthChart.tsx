"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { formatDateShort } from "@/lib/format";

export function GrowthChart({
  data,
}: {
  data: { date: string; weightG: number | null }[];
}) {
  const points = data
    .filter((d) => d.weightG != null)
    .map((d) => ({ date: d.date, label: formatDateShort(d.date), weightG: d.weightG }));

  if (points.length < 2) {
    return (
      <p className="rounded-xl bg-stone-50 p-4 text-center text-sm text-stone-500">
        体重の記録が2件以上になるとグラフが表示されます。
      </p>
    );
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#78716c" }} />
          <YAxis
            tick={{ fontSize: 11, fill: "#78716c" }}
            width={48}
            label={{ value: "g", position: "insideTopLeft", fontSize: 11, fill: "#78716c" }}
          />
          <Tooltip
            formatter={(value) => [`${value} g`, "体重"]}
            labelFormatter={(_l, payload) =>
              payload?.[0] ? formatDateShort(payload[0].payload.date) : ""
            }
            contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "#e7e5e4" }}
          />
          <Line
            type="monotone"
            dataKey="weightG"
            stroke="#f97316"
            strokeWidth={2}
            dot={{ r: 3, fill: "#f97316" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
