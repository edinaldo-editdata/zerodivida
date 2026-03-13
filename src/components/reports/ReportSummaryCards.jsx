import React from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Wallet, PiggyBank } from "lucide-react";

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

const cards = [
  { key: "income", label: "ENTRADAS", icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/15" },
  { key: "expenses", label: "SAÍDAS", icon: TrendingDown, color: "text-rose-400", bg: "bg-rose-500/15" },
  { key: "balance", label: "SALDO", icon: Wallet, color: "text-blue-400", bg: "bg-blue-500/15" },
  { key: "savingsRate", label: "TAXA DE ECONOMIA", icon: PiggyBank, color: "text-amber-400", bg: "bg-amber-500/15", isSavings: true },
];

export default function ReportSummaryCards({ income, expenses, balance, savingsRate }) {
  const values = { income, expenses, balance, savingsRate };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => {
        const Icon = card.icon;
        const val = values[card.key];
        return (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-medium text-slate-400 tracking-wider">{card.label}</p>
              <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${card.color}`} />
              </div>
            </div>
            <p className="text-xl font-bold text-white">
              {card.isSavings ? `${(val || 0).toFixed(1)}%` : formatCurrency(val)}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
}