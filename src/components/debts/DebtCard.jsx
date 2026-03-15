import React from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { CreditCard as CreditCardIcon, Landmark, Home, Zap, Heart, GraduationCap, User, MoreHorizontal, ChevronRight, RefreshCw } from "lucide-react";

const CATEGORY_CONFIG = {
  cartao_credito: { icon: CreditCardIcon, label: "Cartão de Crédito", color: "text-blue-400", bg: "bg-blue-500/10" },
  emprestimo: { icon: Landmark, label: "Empréstimo", color: "text-purple-400", bg: "bg-purple-500/10" },
  financiamento: { icon: Home, label: "Financiamento", color: "text-amber-400", bg: "bg-amber-500/10" },
  conta_fixa: { icon: Zap, label: "Conta Fixa", color: "text-cyan-400", bg: "bg-cyan-500/10" },
  saude: { icon: Heart, label: "Saúde", color: "text-rose-400", bg: "bg-rose-500/10" },
  educacao: { icon: GraduationCap, label: "Educação", color: "text-indigo-400", bg: "bg-indigo-500/10" },
  pessoal: { icon: User, label: "Pessoal", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  outro: { icon: MoreHorizontal, label: "Outro", color: "text-slate-400", bg: "bg-slate-500/10" },
};

const STATUS_CONFIG = {
  em_dia: { label: "Em dia", class: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  atrasada: { label: "Atrasada", class: "bg-red-500/15 text-red-400 border-red-500/20" },
  quitada: { label: "Quitada", class: "bg-slate-500/15 text-slate-400 border-slate-500/20" },
};

const PRIORITY_CONFIG = {
  baixa: { dot: "bg-slate-400" },
  media: { dot: "bg-amber-400" },
  alta: { dot: "bg-orange-500" },
  urgente: { dot: "bg-red-500" },
};

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

export default function DebtCard({ debt, index, onClick, creditCard }) {
  const cat = CATEGORY_CONFIG[debt.category] || CATEGORY_CONFIG.outro;
  const status = STATUS_CONFIG[debt.status] || STATUS_CONFIG.em_dia;
  const priority = PRIORITY_CONFIG[debt.priority] || PRIORITY_CONFIG.media;
  const Icon = cat.icon;
  const progress = debt.total_amount > 0 ? Math.min(((debt.paid_amount || 0) / debt.total_amount) * 100, 100) : 0;
  const remaining = (debt.total_amount || 0) - (debt.paid_amount || 0);
  const isRecurring = debt.recurrence && debt.recurrence !== "none";

  const recurrenceLabels = {
    daily: "Diária",
    weekly: "Semanal",
    biweekly: "Quinzenal",
    monthly: "Mensal",
    bimonthly: "Bimestral",
    quarterly: "Trimestral",
    semiannual: "Semestral",
    annual: "Anual",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.35 }}
      onClick={onClick}
      className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5 hover:bg-white/[0.06] hover:border-white/[0.1] cursor-pointer transition-all duration-300 group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${cat.bg} flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${cat.color}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors">{debt.creditor}</h3>
              <div className={`w-1.5 h-1.5 rounded-full ${priority.dot}`} />
            </div>
            <p className="text-xs text-slate-500">{cat.label}{debt.due_day ? ` • Dia ${debt.due_day}` : ""}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isRecurring && (
            <Badge variant="secondary" className="text-[10px] font-medium border border-cyan-500/20 bg-cyan-500/15 text-cyan-400">
              <RefreshCw className="w-3 h-3 mr-1" />
              {recurrenceLabels[debt.recurrence]}
              {debt.recurrence_count && ` (${debt.recurrence_count}x)`}
            </Badge>
          )}
          <Badge variant="secondary" className={`text-[10px] font-medium border ${status.class}`}>
            {status.label}
          </Badge>
          <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
        </div>
      </div>

      <div className="flex items-end justify-between mb-3">
        <div>
          <p className="text-xs text-slate-500">Saldo devedor</p>
          <p className="text-lg font-bold text-white">{formatCurrency(remaining)}</p>
        </div>
        {debt.total_installments > 1 && (
          <p className="text-xs text-slate-500">
            {debt.paid_installments || 0}/{debt.total_installments} parcelas
          </p>
        )}
      </div>

      <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, delay: index * 0.05 }}
          className={`h-full rounded-full ${debt.status === "quitada" ? "bg-slate-500" : "bg-gradient-to-r from-emerald-400 to-green-500"}`}
        />
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-[10px] text-slate-500">{formatCurrency(debt.paid_amount || 0)} pago</span>
        <span className="text-[10px] text-slate-500">{Math.round(progress)}%</span>
      </div>
      {creditCard && (
        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-3">
          <CreditCardIcon className="w-3.5 h-3.5 text-slate-500" />
          <span className="truncate">{creditCard.name}</span>
          {creditCard.last_four && <span className="text-slate-500">•••• {creditCard.last_four}</span>}
        </div>
      )}
    </motion.div>
  );
}
