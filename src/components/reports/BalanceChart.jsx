import React from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 }).format(value || 0);
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  return (
    <div className="bg-slate-800 border border-white/10 rounded-xl p-3 shadow-2xl text-xs">
      <p className="font-semibold text-white mb-1">{label}</p>
      <p className={`font-bold text-sm ${val >= 0 ? "text-emerald-400" : "text-red-400"}`}>{formatCurrency(val)}</p>
    </div>
  );
};

export default function BalanceChart({ data }) {
  const hasNegative = data.some(d => d.balance < 0);
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
      <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-1">Saldo Acumulado</h3>
      <p className="text-xs text-slate-600 mb-5">Evolução do saldo ao longo dos meses</p>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
            <defs>
              <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="balanceNegGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#F43F5E" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={11} tickLine={false}
              tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            {hasNegative && <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" />}
            <Area
              type="monotone"
              dataKey="balance"
              stroke={hasNegative ? "#F43F5E" : "#10B981"}
              strokeWidth={2}
              fill={hasNegative ? "url(#balanceNegGradient)" : "url(#balanceGradient)"}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}