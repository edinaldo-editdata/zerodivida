import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

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

const COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6", "#6366F1"];

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 shadow-2xl">
        <p className="text-xs font-medium text-white">{payload[0].name}</p>
        <p className="text-sm font-bold text-emerald-400">{formatCurrency(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

export default function DebtChart({ debts }) {
  const categoryData = {};
  debts.forEach((d) => {
    const remaining = (d.total_amount || 0) - (d.paid_amount || 0);
    if (remaining > 0) {
      const cat = d.category || "outro";
      categoryData[cat] = (categoryData[cat] || 0) + remaining;
    }
  });

  const data = Object.entries(categoryData).map(([key, value]) => ({
    name: CATEGORY_LABELS[key] || key,
    value,
  }));

  if (data.length === 0) {
    return (
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6 h-full flex items-center justify-center">
        <p className="text-slate-500 text-sm">Nenhuma dívida ativa</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
      <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">Por Categoria</h3>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value" strokeWidth={0}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-3 mt-3 justify-center">
        {data.map((entry, i) => (
          <div key={entry.name} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="text-xs text-slate-400">{entry.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}