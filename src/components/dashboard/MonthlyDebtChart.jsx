import React, { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingDown, TrendingUp } from "lucide-react";

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 }).format(value || 0);
}

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 shadow-2xl">
        <p className="text-xs font-medium text-white">{payload[0].payload.month}</p>
        <p className="text-sm font-bold text-emerald-400">{formatCurrency(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

export default function MonthlyDebtChart({ debts }) {
  const monthlyData = useMemo(() => {
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    // Gera 12 meses a partir do mês atual
    const data = [];
    for (let i = 0; i < 12; i++) {
      const monthIndex = (currentMonth + i) % 12;
      const year = currentYear + Math.floor((currentMonth + i) / 12);
      const monthDate = new Date(year, monthIndex, 1);
      
      let totalDebt = 0;

      debts.forEach(debt => {
        if (debt.status === "quitada") return;

        const startDate = debt.start_date ? new Date(debt.start_date) : new Date();
        const dueDay = debt.due_day || 1;
        const installments = debt.total_installments || 1;
        const installmentAmount = debt.installment_amount || 0;
        const paidInstallments = debt.paid_installments || 0;
        
        // Calcula quantas parcelas ainda faltam pagar neste mês
        const monthsSinceStart = (monthDate.getFullYear() - startDate.getFullYear()) * 12 + 
                                  (monthDate.getMonth() - startDate.getMonth());
        
        const installmentNumber = monthsSinceStart + 1;
        
        // Se a parcela está dentro do período de pagamento e ainda não foi paga
        if (installmentNumber > paidInstallments && installmentNumber <= installments) {
          totalDebt += installmentAmount;
        }
        
        // Para dívidas sem parcelas definidas (contas fixas recorrentes)
        if (installments === 1 && monthDate >= startDate) {
          const remaining = (debt.total_amount || 0) - (debt.paid_amount || 0);
          if (remaining > 0 && i === 0) {
            totalDebt += remaining;
          }
        }
      });

      data.push({
        month: `${months[monthIndex]}/${String(year).slice(2)}`,
        value: totalDebt,
      });
    }

    return data;
  }, [debts]);

  const trend = useMemo(() => {
    if (monthlyData.length < 2) return null;
    const first = monthlyData[0].value;
    const last = monthlyData[monthlyData.length - 1].value;
    const change = ((last - first) / first) * 100;
    return { direction: last < first ? "down" : "up", percentage: Math.abs(change).toFixed(1) };
  }, [monthlyData]);

  const maxValue = Math.max(...monthlyData.map(d => d.value));

  if (maxValue === 0) {
    return (
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6 h-full flex items-center justify-center">
        <p className="text-slate-500 text-sm">Sem projeção de dívidas</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Projeção Mensal</h3>
          <p className="text-xs text-slate-600 mt-0.5">Dívidas a pagar nos próximos 12 meses</p>
        </div>
        {trend && (
          <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg ${
            trend.direction === "down" ? "bg-emerald-500/10" : "bg-red-500/10"
          }`}>
            {trend.direction === "down" ? (
              <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <TrendingUp className="w-3.5 h-3.5 text-red-400" />
            )}
            <span className={`text-xs font-medium ${
              trend.direction === "down" ? "text-emerald-400" : "text-red-400"
            }`}>
              {trend.percentage}%
            </span>
          </div>
        )}
      </div>
      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <defs>
              <linearGradient id="colorDebt" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis 
              dataKey="month" 
              stroke="#64748b" 
              fontSize={11}
              tickLine={false}
            />
            <YAxis 
              stroke="#64748b" 
              fontSize={11}
              tickLine={false}
              tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke="#10B981" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorDebt)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}