import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Circle } from "lucide-react";
import { format, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

function formatCurrency(v) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
}

export default function DebtPaymentTimeline({ debts }) {
  const activeDebts = debts.filter(d => d.status !== "quitada" && d.total_installments > 1);

  if (activeDebts.length === 0) {
    return (
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">Previsão de Quitação</h3>
        <p className="text-slate-500 text-sm text-center py-4">Nenhuma dívida parcelada ativa</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
      <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">Previsão de Quitação</h3>
      <div className="space-y-4">
        {activeDebts
          .map(debt => {
            const remaining = (debt.total_installments || 1) - (debt.paid_installments || 0);
            const now = new Date();
            const finishDate = addMonths(now, remaining);
            const progress = debt.total_amount > 0
              ? Math.min(((debt.paid_amount || 0) / debt.total_amount) * 100, 100)
              : 0;
            return { ...debt, remaining, finishDate, progress };
          })
          .sort((a, b) => a.finishDate - b.finishDate)
          .map((debt, i) => (
            <motion.div key={debt.id}
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}
              className="flex items-start gap-4 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <div className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                debt.remaining <= 3 ? "bg-emerald-500/20" : "bg-white/[0.04]"
              }`}>
                {debt.remaining <= 1
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  : <Circle className="w-4 h-4 text-slate-500" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-white truncate">{debt.creditor}</p>
                  <p className="text-xs text-slate-400 flex-shrink-0 ml-2">
                    {format(debt.finishDate, "MMM/yy", { locale: ptBR })}
                  </p>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {debt.remaining} parcela{debt.remaining !== 1 ? "s" : ""} restante{debt.remaining !== 1 ? "s" : ""} · {formatCurrency(debt.installment_amount)}/mês
                </p>
                <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden mt-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${debt.progress}%` }}
                    transition={{ duration: 0.7, delay: i * 0.07 }}
                    className="h-full bg-emerald-500 rounded-full"
                  />
                </div>
              </div>
            </motion.div>
          ))}
      </div>
    </div>
  );
}