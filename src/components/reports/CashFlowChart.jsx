import React from "react";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 }).format(value || 0);
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-white/10 rounded-xl p-3 shadow-2xl text-xs">
      <p className="font-semibold text-white mb-2">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ background: p.fill }} />
          <span className="text-slate-400">{p.name}:</span>
          <span className="font-medium text-white">{formatCurrency(p.value)}</span>
        </div>
      ))}
      {payload.length >= 2 && (
        <div className={`mt-2 pt-2 border-t border-white/10 font-semibold ${payload[0].value - payload[1].value >= 0 ? "text-emerald-400" : "text-red-400"}`}>
          Saldo mensal: {formatCurrency(payload[0].value - payload[1].value)}
        </div>
      )}
    </div>
  );
};

export default function CashFlowChart({ data, balanceKey = "cumulative", balanceLabel = "Saldo acumulado" }) {
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
      <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-1">Fluxo de Caixa</h3>
      <p className="text-xs text-slate-600 mb-5">Entradas vs. saídas mensais</p>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 5 }} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={11} tickLine={false}
              tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            <Legend
              wrapperStyle={{ fontSize: "12px", paddingTop: "16px" }}
              formatter={(value) => <span style={{ color: "#94a3b8" }}>{value}</span>}
            />
            <Bar dataKey="income" name="Entradas" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={36} />
            <Bar dataKey="expenses" name="Saídas" fill="#F43F5E" radius={[4, 4, 0, 0]} maxBarSize={36} />
            {balanceKey && (
              <Line
                type="monotone"
                dataKey={balanceKey}
                name={balanceLabel}
                stroke="#38BDF8"
                strokeWidth={2}
                dot={{ fill: "#38BDF8", strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            )}
            </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
