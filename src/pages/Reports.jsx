import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useFirebaseRealtime } from "@/hooks/useFirebaseRealtime";

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
const STORAGE_KEY = "reports_period";

const BASE_PERIOD_OPTIONS = [
  { value: "3m", label: "Últimos 3 meses" },
  { value: "6m", label: "Últimos 6 meses" },
  { value: "12m", label: "Últimos 12 meses" },
];

function getPeriodDefinition(value, now = new Date()) {
  if (!value) {
    return null;
  }

  if (value.startsWith("year-")) {
    const [, yearStr] = value.split("-");
    const year = parseInt(yearStr, 10);
    if (!Number.isFinite(year)) {
      return null;
    }
    return {
      type: "calendar",
      months: 12,
      start: new Date(year, 0, 1),
      label: `Ano ${year}`,
    };
  }

  const months = parseInt(value.replace("m", ""), 10) || parseInt(value, 10) || 6;
  const safeMonths = Math.max(1, months);
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const start = new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth() - (safeMonths - 1), 1);

  return {
    type: "rolling",
    months: safeMonths,
    start,
    label: `Últimos ${safeMonths} meses`,
  };
}

export default function Reports() {
  const [period, setPeriod] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(STORAGE_KEY) || "6m";
    }
    return "6m";
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored !== period) {
      setPeriod(stored);
    }
  }, []);

  const handlePeriodChange = (value) => {
    setPeriod(value);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, value);
    }
  };

  useFirebaseRealtime("Income", ["incomes"], "-date");
  useFirebaseRealtime("Payment", ["payments"], "-payment_date");
  useFirebaseRealtime("Debt", ["debts"], "-created_date");

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

  const periodOptions = useMemo(() => {
    const yearSet = new Set();
    const nowYear = new Date().getFullYear();
    yearSet.add(nowYear);
    yearSet.add(nowYear - 1);

    incomes.forEach(inc => {
      if (inc?.date) {
        const date = new Date(inc.date);
        if (!Number.isNaN(date.getTime())) {
          yearSet.add(date.getFullYear());
        }
      }
    });
    payments.forEach(pay => {
      if (pay?.payment_date) {
        const date = new Date(pay.payment_date);
        if (!Number.isNaN(date.getTime())) {
          yearSet.add(date.getFullYear());
        }
      }
    });

    if (period.startsWith("year-")) {
      const [, yearStr] = period.split("-");
      const yearVal = parseInt(yearStr, 10);
      if (Number.isFinite(yearVal)) {
        yearSet.add(yearVal);
      }
    }

    const yearOptions = Array.from(yearSet)
      .filter(year => Number.isFinite(year))
      .sort((a, b) => b - a)
      .map(year => ({ value: `year-${year}`, label: `Ano ${year}` }));

    return [...BASE_PERIOD_OPTIONS, ...yearOptions];
  }, [incomes, payments, period]);

  useEffect(() => {
    if (!periodOptions.length) {
      return;
    }
    const exists = periodOptions.some(option => option.value === period);
    if (!exists) {
      const fallback = BASE_PERIOD_OPTIONS[1]?.value || periodOptions[0].value;
      setPeriod(fallback);
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, fallback);
      }
    }
  }, [periodOptions, period]);

  const periodDefinition = useMemo(() => getPeriodDefinition(period), [period]);

  const { monthBuckets, rangeStart, rangeEnd } = useMemo(() => {
    if (!periodDefinition) {
      return { monthBuckets: [], rangeStart: null, rangeEnd: null };
    }

    const buckets = [];
    for (let i = 0; i < periodDefinition.months; i++) {
      buckets.push(new Date(periodDefinition.start.getFullYear(), periodDefinition.start.getMonth() + i, 1));
    }
    const startBucket = buckets[0] ? new Date(buckets[0].getTime()) : null;
    const lastBucket = buckets[buckets.length - 1];
    const endDate = lastBucket ? new Date(lastBucket.getFullYear(), lastBucket.getMonth() + 1, 0, 23, 59, 59, 999) : null;

    return { monthBuckets: buckets, rangeStart: startBucket, rangeEnd: endDate };
  }, [periodDefinition]);

  // Build monthly cash flow data
  const monthlyData = useMemo(() => {
    if (!monthBuckets.length) {
      return [];
    }

    return monthBuckets.map(d => {
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

      return { month: monthLabel, income: incomeTotal, expenses: expensesTotal, balance: incomeTotal - expensesTotal };
    });
  }, [incomes, payments, monthBuckets]);

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
    if (!rangeStart) {
      return [];
    }
    const map = {};
    incomes
      .filter(i => {
        const date = new Date(i.date);
        return date >= rangeStart && (!rangeEnd || date <= rangeEnd);
      })
      .forEach(i => {
        map[i.category] = (map[i.category] || 0) + (i.amount || 0);
      });
    return Object.entries(map).map(([k, v]) => ({ label: INCOME_CATEGORY_LABELS[k] || k, value: v }));
  }, [incomes, rangeStart, rangeEnd]);

  // Expenses (payments) — link to debt category
  const expensesByCategory = useMemo(() => {
    if (!rangeStart) {
      return [];
    }
    const map = {};
    payments
      .filter(p => {
        const date = new Date(p.payment_date);
        return date >= rangeStart && (!rangeEnd || date <= rangeEnd);
      })
      .forEach(p => {
        const debt = debts.find(d => d.id === p.debt_id);
        const cat = debt?.category || "outro";
        map[cat] = (map[cat] || 0) + (p.amount || 0);
      });
    return Object.entries(map).map(([k, v]) => ({ label: DEBT_CATEGORY_LABELS[k] || k, value: v }));
  }, [payments, debts, rangeStart, rangeEnd]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="text-white">
      <div className="w-full px-4 sm:px-8 py-8 space-y-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
            <p className="text-sm text-slate-500 mt-0.5">Análise financeira detalhada</p>
          </div>
          <Select value={period} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-48 bg-white/[0.04] border-white/[0.08] text-white">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map(o => (
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
