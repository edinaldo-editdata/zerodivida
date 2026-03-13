import React from "react";
import { motion } from "framer-motion";

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

export default function CategoryBreakdown({ title, data, colorClass, emptyText }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (data.length === 0) {
    return (
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">{title}</h3>
        <p className="text-slate-500 text-sm text-center py-4">{emptyText}</p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
      <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">{title}</h3>
      <div className="space-y-3">
        {data.sort((a, b) => b.value - a.value).map((item, i) => {
          const pct = total > 0 ? (item.value / total) * 100 : 0;
          return (
            <div key={item.label}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-slate-300">{item.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{pct.toFixed(1)}%</span>
                  <span className="text-sm font-semibold text-white">{formatCurrency(item.value)}</span>
                </div>
              </div>
              <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, delay: i * 0.06 }}
                  className={`h-full rounded-full ${colorClass}`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}