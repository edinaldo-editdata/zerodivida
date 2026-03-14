import React, { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreditCard, Filter, Pencil, Trash2 } from "lucide-react";

const BRAND_LABELS = {
  visa: "Visa",
  mastercard: "Mastercard",
  elo: "Elo",
  amex: "Amex",
  hipercard: "Hipercard",
  outro: "Outro",
};

const THEME_CLASSES = {
  emerald: "from-emerald-500 via-emerald-400 to-lime-400",
  violet: "from-violet-500 via-fuchsia-500 to-pink-400",
  cyan: "from-cyan-400 via-teal-400 to-emerald-400",
  amber: "from-amber-500 via-orange-500 to-red-400",
  slate: "from-slate-800 via-slate-700 to-slate-600",
};

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

export default function CreditCardCard({ card, onEdit, onDelete, onFilter, isActive }) {
  const gradient = useMemo(() => THEME_CLASSES[card.theme] || THEME_CLASSES.emerald, [card.theme]);
  const closingDay = card.closing_day ? `Fecha dia ${card.closing_day}` : "Fechamento não definido";
  const dueDay = card.due_day ? `Paga dia ${card.due_day}` : "Vencimento não definido";

  return (
    <div className={`relative rounded-3xl border border-white/10 bg-white/[0.02] overflow-hidden p-4 ring-1 ring-white/5 transition ${isActive ? "border-emerald-400/60 ring-emerald-400/30" : "hover:border-white/20"}`}>
      <div className={`absolute inset-0 opacity-[0.85] pointer-events-none bg-gradient-to-br ${gradient}`} />
      <div className="relative z-10 flex flex-col h-full text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/70">{BRAND_LABELS[card.brand] || "Cartão"}</p>
            <h3 className="text-lg font-semibold mt-1">{card.name}</h3>
            {card.issuer && <p className="text-xs text-white/75">{card.issuer}</p>}
          </div>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" className="h-8 w-8 text-white/80 hover:text-white" onClick={onEdit}>
              <Pencil className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-white/80 hover:text-red-100" onClick={onDelete}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4">
          <CreditCard className="w-6 h-6 text-white/80" />
          <p className="text-xl tracking-widest font-medium">•••• {card.last_four || "0000"}</p>
        </div>
        <div className="mt-auto">
          <p className="text-[11px] text-white/70 uppercase tracking-wider">Limite</p>
          <p className="text-xl font-bold">{formatCurrency(card.credit_limit || 0)}</p>
        </div>
        <div className="flex items-center justify-between mt-3 text-xs text-white/80">
          <span>{closingDay}</span>
          <span>{dueDay}</span>
        </div>
        <div className="flex items-center justify-between mt-4">
          <Badge variant="secondary" className={`bg-white/15 text-white border-white/20 text-[10px] tracking-wider uppercase ${isActive ? "border-white/60" : ""}`}>
            {isActive ? "Filtro ativo" : "Cartão"}
          </Badge>
          <Button size="sm" variant="secondary" onClick={onFilter} className={`h-8 text-xs ${isActive ? "bg-white text-emerald-600" : "bg-white/15 text-white"}`}>
            <Filter className="w-3.5 h-3.5 mr-1" />
            {isActive ? "Remover filtro" : "Filtrar dívidas"}
          </Button>
        </div>
      </div>
    </div>
  );
}
