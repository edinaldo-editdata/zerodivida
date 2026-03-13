import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

import ReportSummaryCards from "@/components/reports/ReportSummaryCards";
import CashFlowChart from "@/components/reports/CashFlowChart";
import BalanceChart from "@/components/reports/BalanceChart";
import CategoryBreakdown from "@/components/reports/CategoryBreakdown";
import DebtPaymentTimeline from "@/components/reports/DebtPaymentTimeline";
import MonthlyDebtChart from "@/components/dashboard/MonthlyDebtChart";

const INCOME_CATEGORY_LABELS = {
  salario: "Salário", freelance: "Freelance", investimento: "Investimento",
  aluguel: "Aluguel", bonus: "Bônus", presente: "Presente", outro: "Outro",
};
const DEBT_CATEGORY_LABELS = {
  cartao_credito: "Cartão de Crédito", emprestimo: "Empréstimo", financiamento: "Financiamento",
  conta_fixa: "Conta Fixa", saude: "Saúde", educacao: "Educação", pessoal: "Pessoal", outro: "Outro",
};

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const PERIOD_OPTIONS = [
  { value: "3", label: "Últimos 3 meses" },
  { value: "6", label: "Últimos 6 meses" },
  { value: "12", label: "Últimos 12 meses" },
];

export default function Reports() {
  const [period, setPeriod] = useState("6");

  const { data: incomes = [], isLoading: loadingIncomes } = useQuery({
    queryKey: ["incomes"],
    queryFn: () => base44.entities.Income.list("-date"),
  });

  const { data: payments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ["payments"],
    queryFn: () => base44.entities.Payment.list("-payment_date"),
  });

  const { data: debts = [], isLoading: loadingDebts } = useQuery({
    queryKey: ["debts"],
    queryFn: () => base44.entities.Debt.list("-created_date"),
  });

  const isLoading = loadingIncomes || loadingPayments || loadingDebts;

  // Build monthly cash flow data
  const monthlyData = useMemo(() => {
    const monthCount = parseInt(period);
    const now = new Date();
    const data = [];

    for (let i = monthCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = `${MONTHS[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;

      const incomeTotal = incomes
        .filter(inc => {
          const id = new Date(inc.date);
          return id.getFullYear() === d.getFullYear() && id.getMonth() === d.getMonth();
        })
        .reduce((s, inc) => s + (inc.amount || 0), 0);

      const expensesTotal = payments
        .filter(p => {
          const pd = new Date(p.payment_date);
          return pd.getFullYear() === d.getFullYear() && pd.getMonth() === d.getMonth();
        })
        .reduce((s, p) => s + (p.amount || 0), 0);

      data.push({ month: monthLabel, income: incomeTotal, expenses: expensesTotal, balance: incomeTotal - expensesTotal });
    }
    return data;
  }, [incomes, payments, period]);

  // Accumulated balance
  const accumulatedData = useMemo(() => {
    let acc = 0;
    return monthlyData.map(d => {
      acc += d.balance;
      return { ...d, balance: acc };
    });
  }, [monthlyData]);

  // Summary for selected period
  const periodIncome = monthlyData.reduce((s, d) => s + d.income, 0);
  const periodExpenses = monthlyData.reduce((s, d) => s + d.expenses, 0);
  const periodBalance = periodIncome - periodExpenses;
  const savingsRate = periodIncome > 0 ? (periodBalance / periodIncome) * 100 : 0;

  // Income by category
  const incomeByCategory = useMemo(() => {
    const monthCount = parseInt(period);
    const now = new Date();
    const cutoff = new Date(now.getFullYear(), now.getMonth() - monthCount + 1, 1);
    const map = {};
    incomes
      .filter(i => new Date(i.date) >= cutoff)
      .forEach(i => {
        map[i.category] = (map[i.category] || 0) + (i.amount || 0);
      });
    return Object.entries(map).map(([k, v]) => ({ label: INCOME_CATEGORY_LABELS[k] || k, value: v }));
  }, [incomes, period]);

  // Expenses (payments) — link to debt category
  const expensesByCategory = useMemo(() => {
    const monthCount = parseInt(period);
    const now = new Date();
    const cutoff = new Date(now.getFullYear(), now.getMonth() - monthCount + 1, 1);
    const map = {};
    payments
      .filter(p => new Date(p.payment_date) >= cutoff)
      .forEach(p => {
        const debt = debts.find(d => d.id === p.debt_id);
        const cat = debt?.category || "outro";
        map[cat] = (map[cat] || 0) + (p.amount || 0);
      });
    return Object.entries(map).map(([k, v]) => ({ label: DEBT_CATEGORY_LABELS[k] || k, value: v }));
  }, [payments, debts, period]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white">
      <div className="w-full px-4 sm:px-8 py-8 space-y-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
            <p className="text-sm text-slate-500 mt-0.5">Análise financeira detalhada</p>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-48 bg-white/[0.04] border-white/[0.08] text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>

        {/* Summary */}
        <ReportSummaryCards
          income={periodIncome}
          expenses={periodExpenses}
          balance={periodBalance}
          savingsRate={savingsRate}
        />

        {/* Cash flow */}
        <CashFlowChart data={monthlyData} />

        {/* Balance evolution */}
        <BalanceChart data={accumulatedData} />

        {/* Categories */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CategoryBreakdown
            title="Entradas por Categoria"
            data={incomeByCategory}
            colorClass="bg-emerald-500"
            emptyText="Sem entradas no período"
          />
          <CategoryBreakdown
            title="Saídas por Categoria"
            data={expensesByCategory}
            colorClass="bg-rose-500"
            emptyText="Sem pagamentos no período"
          />
        </div>

        {/* Debt projection & timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MonthlyDebtChart debts={debts} />
          <DebtPaymentTimeline debts={debts} />
        </div>
      </div>
    </div>
  );
}