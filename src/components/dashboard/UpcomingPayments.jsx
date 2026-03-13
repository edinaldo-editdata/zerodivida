import React from "react";
import { CalendarDays, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

const CATEGORY_LABELS = {
  cartao_credito: "Cartão de Crédito",
  emprestimo: "Empréstimo",
  financiamento: "Financiamento",
  conta_fixa: "Conta Fixa",
  saude: "Saúde",
  educacao: "Educação",
  pessoal: "Pessoal",
  outro: "Outro",
};

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

export default function UpcomingPayments({ debts, onSelect }) {
  const today = new Date();
  const currentDay = today.getDate();

  const activeDebts = debts
    .filter(d => d.status !== "quitada" && d.due_day)
    .map(d => {
      const daysUntilDue = d.due_day >= currentDay ? d.due_day - currentDay : 30 - currentDay + d.due_day;
      return { ...d, daysUntilDue };
    })
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue)
    .slice(0, 5);

  if (activeDebts.length === 0) {
    return (
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6 h-full flex items-center justify-center">
        <p className="text-slate-500 text-sm">Nenhum vencimento próximo</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
      <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">Próximos Vencimentos</h3>
      <div className="space-y-3">
        {activeDebts.map((debt, i) => (
          <motion.div
            key={debt.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            onClick={() => onSelect(debt)}
            className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.05] cursor-pointer transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${debt.daysUntilDue <= 3 ? "bg-red-500/20" : "bg-emerald-500/10"}`}>
                {debt.daysUntilDue <= 3 ? (
                  <AlertCircle className="w-4 h-4 text-red-400" />
                ) : (
                  <CalendarDays className="w-4 h-4 text-emerald-400" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-white group-hover:text-emerald-300 transition-colors">{debt.creditor}</p>
                <p className="text-xs text-slate-500">{CATEGORY_LABELS[debt.category] || debt.category} • Dia {debt.due_day}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-white">{formatCurrency(debt.installment_amount || 0)}</p>
              <p className={`text-xs ${debt.daysUntilDue <= 3 ? "text-red-400" : "text-slate-500"}`}>
                {debt.daysUntilDue === 0 ? "Hoje" : `em ${debt.daysUntilDue}d`}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}