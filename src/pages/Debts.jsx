import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Loader2, Filter } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useFirebaseRealtime } from "@/hooks/useFirebaseRealtime";

import DebtCard from "@/components/debts/DebtCard";
import DebtForm from "@/components/debts/DebtForm";
import DebtDetail from "@/components/debts/DebtDetail";
import PaymentForm from "@/components/debts/PaymentForm";
import CreditCardForm from "@/components/credit-cards/CreditCardForm";
import CreditCardCard from "@/components/credit-cards/CreditCardCard";

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function formatCurrency(value) {
  return currencyFormatter.format(value || 0);
}

function getMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(date) {
  const monthName = date.toLocaleDateString("pt-BR", { month: "long" });
  return `${monthName.charAt(0).toUpperCase()}${monthName.slice(1)} / ${date.getFullYear()}`;
}

function monthKeyToDate(key) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, (month || 1) - 1, 1);
}

function parseNumber(value, fallback = 0) {
  const parsed = typeof value === "string" ? parseFloat(value) : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getReferenceDate(debt) {
  const source = debt.start_date || debt.created_date;
  if (!source) return null;
  const parsed = new Date(source);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), 1);
}

function getInstallmentData(debt, targetMonthDate) {
  const reference = getReferenceDate(debt);
  if (!reference || !targetMonthDate) return null;

  const totalInstallments = Math.max(1, parseInt(debt.total_installments, 10) || parseNumber(debt.total_installments, 1));
  const monthsSinceStart = (targetMonthDate.getFullYear() - reference.getFullYear()) * 12 + (targetMonthDate.getMonth() - reference.getMonth());

  if (monthsSinceStart < 0) return null;
  const installmentNumber = monthsSinceStart + 1;
  if (installmentNumber < 1 || installmentNumber > totalInstallments) return null;

  const installmentAmount = parseNumber(debt.installment_amount);
  const fallbackAmount = parseNumber(debt.total_amount) / totalInstallments;
  const amount = Number.isFinite(installmentAmount) && installmentAmount > 0 ? installmentAmount : fallbackAmount || 0;
  const paidInstallments = parseInt(debt.paid_installments, 10) || 0;
  const fullySettled = debt.status === "quitada" || parseNumber(debt.paid_amount) >= parseNumber(debt.total_amount);

  const isPaid = fullySettled || installmentNumber <= paidInstallments;
  const isOverdue = !isPaid && debt.status === "atrasada";

  return { amount, isPaid, isOverdue };
}

export default function Debts() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [cardFilter, setCardFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState(() => getMonthKey(new Date()));
  const [yearFilter, setYearFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editDebt, setEditDebt] = useState(null);
  const [selectedDebt, setSelectedDebt] = useState(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [editPayment, setEditPayment] = useState(null);
  const [showCardForm, setShowCardForm] = useState(false);
  const [editCard, setEditCard] = useState(null);
  const queryClient = useQueryClient();

  const openPaymentForm = (payment = null) => {
    setEditPayment(payment);
    setShowPaymentForm(true);
  };

  const closePaymentForm = () => {
    setShowPaymentForm(false);
    setEditPayment(null);
  };

  const handleDeletePayment = (payment) => {
    if (!payment?.id) return;
    const confirmed = window.confirm(`Deseja remover o pagamento de ${formatCurrency(payment.amount)}? Esta ação não pode ser desfeita.`);
    if (!confirmed) return;
    deletePayment.mutate({ id: payment.id, payment });
  };

  useFirebaseRealtime("Debt", ["debts"], "-created_date");
  useFirebaseRealtime("Payment", ["payments"], "-payment_date");
  useFirebaseRealtime("CreditCard", ["creditCards"], "name");

  const { data: debts = [], isLoading } = useQuery({
    queryKey: ["debts"],
    queryFn: () => base44.entities.Debt.list("-created_date"),
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["payments"],
    queryFn: () => base44.entities.Payment.list("-payment_date"),
  });

  const { data: creditCards = [] } = useQuery({
    queryKey: ["creditCards"],
    queryFn: () => base44.entities.CreditCard.list("name"),
  });

  const createDebt = useMutation({
    mutationFn: (data) => base44.entities.Debt.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["debts"] }); setShowForm(false); },
  });

  const updateDebt = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Debt.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debts"] });
      setShowForm(false); setEditDebt(null); setSelectedDebt(null);
    },
  });

  const deleteDebt = useMutation({
    mutationFn: (id) => base44.entities.Debt.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["debts"] }); setSelectedDebt(null); },
  });

  const createPayment = useMutation({
    mutationFn: (data) => base44.entities.Payment.create(data),
    onSuccess: async (_, variables) => {
      const debt = debts.find(d => d.id === variables.debt_id);
      if (debt) {
        const newPaidAmount = (debt.paid_amount || 0) + variables.amount;
        const newPaidInstallments = (debt.paid_installments || 0) + 1;
        const newStatus = newPaidAmount >= debt.total_amount ? "quitada" : debt.status;
        await base44.entities.Debt.update(debt.id, {
          paid_amount: newPaidAmount,
          paid_installments: newPaidInstallments,
          status: newStatus,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["debts"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      closePaymentForm();
    },
  });

  const updatePayment = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Payment.update(id, data),
    onSuccess: async (_, variables) => {
      const previousPayment = payments.find(p => p.id === variables.id);
      const targetDebtId = previousPayment?.debt_id || variables.data?.debt_id;
      if (previousPayment && targetDebtId) {
        const relatedDebt = debts.find(d => d.id === targetDebtId);
        if (relatedDebt) {
          const prevAmount = parseNumber(previousPayment.amount);
          const nextAmount = parseNumber(variables.data.amount ?? previousPayment.amount);
          const totalAmount = parseNumber(relatedDebt.total_amount);
          const newPaidAmount = Math.max(0, (relatedDebt.paid_amount || 0) - prevAmount + nextAmount);
          let newStatus = relatedDebt.status;
          if (totalAmount > 0 && newPaidAmount >= totalAmount) {
            newStatus = "quitada";
          } else if (relatedDebt.status === "quitada" && newPaidAmount < totalAmount) {
            newStatus = "em_dia";
          }
          await base44.entities.Debt.update(relatedDebt.id, {
            paid_amount: newPaidAmount,
            status: newStatus,
          });
        }
      }
      queryClient.invalidateQueries({ queryKey: ["debts"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      closePaymentForm();
    },
  });

  const deletePayment = useMutation({
    mutationFn: ({ id }) => base44.entities.Payment.delete(id),
    onSuccess: async (_, variables) => {
      const payment = variables.payment;
      const relatedDebtId = payment?.debt_id;
      if (payment && relatedDebtId) {
        const relatedDebt = debts.find(d => d.id === relatedDebtId);
        if (relatedDebt) {
          const amountToRemove = parseNumber(payment.amount);
          const newPaidAmount = Math.max(0, (relatedDebt.paid_amount || 0) - amountToRemove);
          const newPaidInstallments = Math.max(0, (relatedDebt.paid_installments || 0) - 1);
          const totalAmount = parseNumber(relatedDebt.total_amount);
          let newStatus = relatedDebt.status;
          if (relatedDebt.status === "quitada" && newPaidAmount < totalAmount) {
            newStatus = "em_dia";
          }
          await base44.entities.Debt.update(relatedDebt.id, {
            paid_amount: newPaidAmount,
            paid_installments: newPaidInstallments,
            status: newStatus,
          });
        }
      }
      queryClient.invalidateQueries({ queryKey: ["debts"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      if (editPayment?.id === payment?.id) {
        closePaymentForm();
      }
    },
  });

  const createCard = useMutation({
    mutationFn: (data) => base44.entities.CreditCard.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["creditCards"] });
      setShowCardForm(false);
      setEditCard(null);
    },
  });

  const updateCard = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CreditCard.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["creditCards"] });
      setShowCardForm(false);
      setEditCard(null);
    },
  });

  const deleteCard = useMutation({
    mutationFn: (id) => base44.entities.CreditCard.delete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["creditCards"] });
      setCardFilter(prev => prev === id ? "all" : prev);
    },
  });

  const selectedMonthDate = useMemo(() => {
    if (monthFilter === "all") return null;
    return monthKeyToDate(monthFilter);
  }, [monthFilter]);

  const allMonthOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const minYear = 2000;
    const maxYear = currentYear + 1;
    const map = new Map();
    const addMonth = (date) => {
      const normalized = new Date(date.getFullYear(), date.getMonth(), 1);
       const year = normalized.getFullYear();
       if (year < minYear || year > maxYear) return;
      const key = getMonthKey(normalized);
      if (!map.has(key)) {
        map.set(key, { value: key, label: formatMonthLabel(normalized) });
      }
    };

    addMonth(new Date());

    debts.forEach(debt => {
      const reference = getReferenceDate(debt);
      if (!reference) return;
      const totalInstallments = Math.max(1, parseInt(debt.total_installments, 10) || 1);
      for (let i = 0; i < totalInstallments; i++) {
        const monthDate = new Date(reference.getFullYear(), reference.getMonth() + i, 1);
        addMonth(monthDate);
      }
    });

    return Array.from(map.values()).sort((a, b) => b.value.localeCompare(a.value));
  }, [debts]);

  const yearOptions = useMemo(() => {
    const years = new Set();
    const currentYear = new Date().getFullYear();
    const minYear = 2000;
    const maxYear = currentYear + 1;
    allMonthOptions.forEach(opt => {
      const yearPart = opt.value.split("-")[0];
      const yearNum = Number(yearPart);
      if (yearPart && Number.isFinite(yearNum) && yearNum >= minYear && yearNum <= maxYear) {
        years.add(yearPart);
      }
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [allMonthOptions]);

  const monthOptions = useMemo(() => {
    if (yearFilter === "all") return allMonthOptions;
    return allMonthOptions.filter(opt => opt.value.startsWith(`${yearFilter}-`));
  }, [allMonthOptions, yearFilter]);

  useEffect(() => {
    if (yearFilter === "all") return;
    if (monthFilter === "all") return;
    if (!monthFilter.startsWith(`${yearFilter}-`)) {
      setMonthFilter("all");
    }
  }, [yearFilter, monthFilter]);

  const currentPeriodLabel = useMemo(() => {
    if (monthFilter === "all") {
      return yearFilter === "all" ? "Todos os meses" : `Ano ${yearFilter}`;
    }
    const match = allMonthOptions.find(opt => opt.value === monthFilter);
    if (match) return match.label;
    return formatMonthLabel(selectedMonthDate || new Date());
  }, [monthFilter, yearFilter, allMonthOptions, selectedMonthDate]);

  const creditCardMap = useMemo(() => {
    const map = new Map();
    creditCards.forEach(card => {
      if (card?.id) {
        map.set(card.id, card);
      }
    });
    return map;
  }, [creditCards]);

  const filteredDebts = useMemo(() => {
    return debts.filter(d => {
      const normalizedSearch = search.trim().toLowerCase();
      const matchSearch = !normalizedSearch || d.creditor?.toLowerCase().includes(normalizedSearch) || d.description?.toLowerCase().includes(normalizedSearch);
      const matchCategory = categoryFilter === "all" || d.category === categoryFilter;
      const monthInfo = selectedMonthDate ? getInstallmentData(d, selectedMonthDate) : null;

      const matchesMonth = (() => {
        if (!selectedMonthDate) return true;
        if (!monthInfo) return false;
        if (statusFilter === "pago" || statusFilter === "quitada") return true;
        if (statusFilter === "pendente") return !monthInfo.isPaid;
        if (statusFilter === "atrasada") return !monthInfo.isPaid && monthInfo.isOverdue;
        if (statusFilter === "em_dia") return !monthInfo.isPaid && !monthInfo.isOverdue;
        return !monthInfo.isPaid;
      })();

      const matchesStatus = (() => {
        switch (statusFilter) {
          case "pendente":
            return selectedMonthDate ? !!(monthInfo && !monthInfo.isPaid) : d.status !== "quitada";
          case "pago":
            return selectedMonthDate ? !!(monthInfo && monthInfo.isPaid) : d.status === "quitada";
          case "em_dia":
            return selectedMonthDate ? !!(monthInfo && !monthInfo.isPaid && !monthInfo.isOverdue) : d.status === "em_dia";
          case "atrasada":
            return selectedMonthDate ? !!(monthInfo && !monthInfo.isPaid && monthInfo.isOverdue) : d.status === "atrasada";
          case "quitada":
            return selectedMonthDate ? !!(monthInfo && monthInfo.isPaid) : d.status === "quitada";
          case "all":
          default:
            return true;
        }
      })();

      const matchesCard = (() => {
        if (cardFilter === "all") return true;
        if (cardFilter === "no_card") return !d.credit_card_id;
        return d.credit_card_id === cardFilter;
      })();

      return matchSearch && matchCategory && matchesStatus && matchesMonth && matchesCard;
    });
  }, [debts, search, statusFilter, categoryFilter, selectedMonthDate, cardFilter]);

  const monthSummary = useMemo(() => {
    if (!selectedMonthDate) return null;
    return debts.reduce((acc, debt) => {
      const info = getInstallmentData(debt, selectedMonthDate);
      if (!info) return acc;

      const value = info.amount || 0;
      acc.totalAmount += value;
      acc.totalCount += 1;

      if (info.isPaid) {
        acc.paidAmount += value;
        acc.paidCount += 1;
      } else {
        acc.pendingAmount += value;
        acc.pendingCount += 1;
        if (info.isOverdue) {
          acc.overdueAmount += value;
          acc.overdueCount += 1;
        }
      }

      return acc;
    }, {
      totalAmount: 0,
      totalCount: 0,
      pendingAmount: 0,
      pendingCount: 0,
      paidAmount: 0,
      paidCount: 0,
      overdueAmount: 0,
      overdueCount: 0,
    });
  }, [debts, selectedMonthDate]);

  const monthSummaryCards = useMemo(() => {
    if (!selectedMonthDate || !monthSummary) return [];
    return [
      {
        key: "pendente",
        title: "Pendentes",
        amount: monthSummary.pendingAmount,
        count: monthSummary.pendingCount,
        helper: "Cobranças aguardando pagamento",
        border: "border-amber-500/20",
        bg: "bg-amber-500/5",
        accent: "text-amber-400",
      },
      {
        key: "pago",
        title: "Pagas",
        amount: monthSummary.paidAmount,
        count: monthSummary.paidCount,
        helper: "Parcelas já quitadas neste mês",
        border: "border-emerald-500/20",
        bg: "bg-emerald-500/5",
        accent: "text-emerald-400",
      },
      {
        key: "atrasada",
        title: "Em atraso",
        amount: monthSummary.overdueAmount,
        count: monthSummary.overdueCount,
        helper: "Pagamentos vencidos",
        border: "border-red-500/20",
        bg: "bg-red-500/5",
        accent: "text-red-400",
      },
    ];
  }, [monthSummary, selectedMonthDate]);

  const handleSaveDebt = (data) => {
    if (editDebt) {
      updateDebt.mutate({ id: editDebt.id, data });
    } else {
      createDebt.mutate(data);
    }
  };

  const handleSaveCard = (data) => {
    if (editCard) {
      updateCard.mutate({ id: editCard.id, data });
    } else {
      createCard.mutate(data);
    }
  };

  const handleDeleteCard = (card) => {
    if (!window.confirm(`Deseja remover o cartão ${card.name}?`)) return;
    deleteCard.mutate(card.id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="text-white">
      <div className="w-full px-4 sm:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6"
        >
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Todas as Dívidas</h1>
            <p className="text-sm text-slate-500 mt-0.5">{debts.length} dívida{debts.length !== 1 ? "s" : ""} cadastrada{debts.length !== 1 ? "s" : ""}</p>
          </div>
          <Button
            onClick={() => { setEditDebt(null); setShowForm(true); }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" /> Nova Dívida
          </Button>
        </motion.div>

        {/* Credit Cards */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="rounded-2xl bg-white/[0.03] border border-white/[0.05] p-4 sm:p-5 mb-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Cartões de crédito</p>
              <h2 className="text-lg font-semibold text-white mt-1">Controle dos cartões vinculados</h2>
              <p className="text-sm text-slate-500">Cadastre seus cartões para relacionar dívidas e acompanhar limites.</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="border-white/10 text-slate-200 hover:text-white"
                onClick={() => { setCardFilter("all"); }}
              >
                Limpar filtros
              </Button>
              <Button
                onClick={() => { setEditCard(null); setShowCardForm(true); }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" /> Novo Cartão
              </Button>
            </div>
          </div>
          {creditCards.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/[0.1] p-6 text-center text-sm text-slate-400">
              Nenhum cartão cadastrado. Vincule seus cartões para separar gastos por fatura.
              <div className="mt-4">
                <Button onClick={() => { setEditCard(null); setShowCardForm(true); }} className="bg-white/10">
                  <Plus className="w-4 h-4 mr-2" /> Cadastrar cartão
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {creditCards.map(card => (
                <CreditCardCard
                  key={card.id}
                  card={card}
                  isActive={cardFilter === card.id}
                  onEdit={() => { setEditCard(card); setShowCardForm(true); }}
                  onDelete={() => handleDeleteCard(card)}
                  onFilter={() => setCardFilter(prev => prev === card.id ? "all" : card.id)}
                />
              ))}
            </div>
          )}
        </motion.div>

        {/* Month Filter + Summary */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 sm:p-5 mb-6"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Mês de referência</p>
              <p className="text-lg font-semibold text-white mt-1">
                {currentPeriodLabel}
              </p>
              <p className="text-sm text-slate-500">Selecione um mês para visualizar os vencimentos previstos e pendentes.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger className="w-full sm:w-36 bg-white/[0.03] border-white/[0.08] text-white">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os anos</SelectItem>
                  {yearOptions.map(year => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={monthFilter} onValueChange={setMonthFilter}>
                <SelectTrigger className="w-full sm:w-60 bg-white/[0.03] border-white/[0.08] text-white">
                  <SelectValue placeholder="Filtrar por mês" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="all">Todos os meses</SelectItem>
                  {monthOptions.length === 0 && yearFilter !== "all" && (
                    <SelectItem value="__no_months" disabled>
                      Nenhum mês disponível para {yearFilter}
                    </SelectItem>
                  )}
                  {monthOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedMonthDate && (
            monthSummaryCards.length > 0 && monthSummary.totalCount > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                {monthSummaryCards.map(card => {
                  const isActive = statusFilter === card.key;
                  return (
                    <button
                      type="button"
                      key={card.key}
                      onClick={() => setStatusFilter(prev => prev === card.key ? "all" : card.key)}
                      aria-pressed={isActive}
                      className={`rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 ${card.border} ${card.bg} ${isActive ? "border-white/40 bg-white/10 shadow-lg" : "hover:border-white/20"}`}
                    >
                      <p className={`text-xs uppercase tracking-wider ${card.accent}`}>{card.title}</p>
                      <p className="text-xl font-bold text-white mt-1">{formatCurrency(card.amount)}</p>
                      <p className="text-[11px] text-slate-300">{card.count} {card.count === 1 ? "registro" : "registros"}</p>
                      <p className="text-[10px] text-slate-500 mt-1">{card.helper}{isActive ? " • filtro ativo" : " • clique para filtrar"}</p>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-500 mt-4">Nenhuma cobrança prevista para este mês.</p>
            )
          )}
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-3 mb-6"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar dívidas..."
              className="pl-9 bg-white/[0.03] border-white/[0.08] text-white placeholder:text-slate-500"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40 bg-white/[0.03] border-white/[0.08] text-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pendente">Pendentes</SelectItem>
              <SelectItem value="pago">Pagas</SelectItem>
              <SelectItem value="em_dia">Em dia</SelectItem>
              <SelectItem value="atrasada">Atrasada</SelectItem>
              <SelectItem value="quitada">Quitadas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-44 bg-white/[0.03] border-white/[0.08] text-white">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
              <SelectItem value="emprestimo">Empréstimo</SelectItem>
              <SelectItem value="financiamento">Financiamento</SelectItem>
              <SelectItem value="conta_fixa">Conta Fixa</SelectItem>
              <SelectItem value="saude">Saúde</SelectItem>
              <SelectItem value="educacao">Educação</SelectItem>
              <SelectItem value="pessoal">Pessoal</SelectItem>
              <SelectItem value="outro">Outro</SelectItem>
            </SelectContent>
          </Select>
          <Select value={cardFilter} onValueChange={setCardFilter}>
            <SelectTrigger className="w-full sm:w-48 bg-white/[0.03] border-white/[0.08] text-white">
              <SelectValue placeholder="Cartão" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os cartões</SelectItem>
              <SelectItem value="no_card">Sem cartão</SelectItem>
              {creditCards.map(card => (
                <SelectItem key={card.id} value={card.id}>{card.name}{card.last_four ? ` •••• ${card.last_four}` : ""}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>

        {/* Grid */}
        {filteredDebts.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
              <Filter className="w-7 h-7 text-slate-600" />
            </div>
            <p className="text-slate-400 text-sm">{selectedMonthDate || cardFilter !== "all" ? "Nenhuma dívida encontrada para os filtros selecionados" : "Nenhuma dívida encontrada"}</p>
            <p className="text-slate-600 text-xs mt-1">{selectedMonthDate || cardFilter !== "all" ? "Ajuste o filtro de mês/cartão ou registre novos pagamentos" : "Tente ajustar os filtros ou adicione uma nova dívida"}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filteredDebts.map((debt, i) => (
                <DebtCard
                  key={debt.id}
                  debt={debt}
                  index={i}
                  onClick={() => setSelectedDebt(debt)}
                  creditCard={creditCardMap.get(debt.credit_card_id)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Modals */}
      {showForm && (
        <DebtForm
          open={showForm}
          onClose={() => { setShowForm(false); setEditDebt(null); }}
          onSave={handleSaveDebt}
          editDebt={editDebt}
          creditCards={creditCards}
        />
      )}

      {selectedDebt && !showPaymentForm && !showForm && (
        <DebtDetail
          open={!!selectedDebt}
          onClose={() => setSelectedDebt(null)}
          debt={selectedDebt}
          payments={payments}
          onEdit={() => { setEditDebt(selectedDebt); setShowForm(true); }}
          onDelete={() => deleteDebt.mutate(selectedDebt.id)}
          onAddPayment={() => openPaymentForm(null)}
          onEditPayment={(payment) => openPaymentForm(payment)}
          onDeletePayment={handleDeletePayment}
          creditCard={selectedDebt ? creditCardMap.get(selectedDebt.credit_card_id) : null}
        />
      )}

      {showPaymentForm && selectedDebt && (
        <PaymentForm
          open={showPaymentForm}
          onClose={closePaymentForm}
          onSave={(data) => createPayment.mutate(data)}
          onUpdate={({ id, data }) => updatePayment.mutate({ id, data })}
          debt={selectedDebt}
          editPayment={editPayment}
        />
      )}

      {showCardForm && (
        <CreditCardForm
          open={showCardForm}
          onClose={() => { setShowCardForm(false); setEditCard(null); }}
          onSave={handleSaveCard}
          editCard={editCard}
        />
      )}
    </div>
  );
}
