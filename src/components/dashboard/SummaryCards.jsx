import React from "react";
import { motion } from "framer-motion";
import { DollarSign, TrendingDown, CheckCircle2, AlertTriangle } from "lucide-react";

const cards = [
  { key: "total", label: "Dívida Total", icon: DollarSign, color: "from-rose-500 to-pink-600", iconBg: "bg-rose-500/20" },
  { key: "remaining", label: "Saldo Devedor", icon: TrendingDown, color: "from-amber-500 to-orange-600", iconBg: "bg-amber-500/20" },
  { key: "paid", label: "Total Pago", icon: CheckCircle2, color: "from-emerald-500 to-green-600", iconBg: "bg-emerald-500/20" },
  { key: "overdue", label: "Em Atraso", icon: AlertTriangle, color: "from-red-500 to-red-700", iconBg: "bg-red-500/20" },
];

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

export default function SummaryCards({ debts }) {
  const totalAmount = debts.reduce((s, d) => s + (d.total_amount || 0), 0);
  const paidAmount = debts.reduce((s, d) => s + (d.paid_amount || 0), 0);
  const remaining = totalAmount - paidAmount;
  const overdueAmount = debts.filter(d => d.status === "atrasada").reduce((s, d) => s + ((d.total_amount || 0) - (d.paid_amount || 0)), 0);

  const values = { total: totalAmount, remaining, paid: paidAmount, overdue: overdueAmount };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
            className="relative overflow-hidden rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl p-5 group hover:border-white/[0.12] transition-all duration-300"
          >
            <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br ${card.color} opacity-[0.07] group-hover:opacity-[0.12] transition-opacity`} />
            <div className="flex items-start justify-between relative z-10">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{card.label}</p>
                <p className="text-2xl font-bold text-white mt-2">{formatCurrency(values[card.key])}</p>
              </div>
              <div className={`${card.iconBg} p-2.5 rounded-xl`}>
                <Icon className="w-5 h-5 text-white/80" />
              </div>
            </div>
            {card.key === "paid" && totalAmount > 0 && (
              <div className="mt-3 relative z-10">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Progresso</span>
                  <span>{Math.round((paidAmount / totalAmount) * 100)}%</span>
                </div>
                <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((paidAmount / totalAmount) * 100, 100)}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="h-full bg-gradient-to-r from-emerald-400 to-green-500 rounded-full"
                  />
                </div>
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}