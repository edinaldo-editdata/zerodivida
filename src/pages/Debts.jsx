import React, { useState, useMemo } from "react";
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
  const [monthFilter, setMonthFilter] = useState(() => getMonthKey(new Date()));
  const [showForm, setShowForm] = useState(false);
  const [editDebt, setEditDebt] = useState(null);
  const [selectedDebt, setSelectedDebt] = useState(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const queryClient = useQueryClient();

  useFirebaseRealtime("Debt", ["debts"], "-created_date");
  useFirebaseRealtime("Payment", ["payments"], "-payment_date");

  const { data: debts = [], isLoading } = useQuery({
    queryKey: ["debts"],
    queryFn: () => base44.entities.Debt.list("-created_date"),
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["payments"],
    queryFn: () => base44.entities.Payment.list("-payment_date"),
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
      setShowPaymentForm(false);
    },
  });

  const selectedMonthDate = useMemo(() => {
    if (monthFilter === "all") return null;
    return monthKeyToDate(monthFilter);
  }, [monthFilter]);

  const monthOptions = useMemo(() => {
    const map = new Map();
    const addMonth = (date) => {
      const normalized = new Date(date.getFullYear(), date.getMonth(), 1);
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

      return matchSearch && matchCategory && matchesStatus && matchesMonth;
    });
  }, [debts, search, statusFilter, categoryFilter, selectedMonthDate]);

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white">
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
                {monthFilter === "all" ? "Todos os meses" : (monthOptions.find(opt => opt.value === monthFilter)?.label || formatMonthLabel(selectedMonthDate || new Date()))}
              </p>
              <p className="text-sm text-slate-500">Selecione um mês para visualizar os vencimentos previstos e pendentes.</p>
            </div>
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="w-full sm:w-60 bg-white/[0.03] border-white/[0.08] text-white">
                <SelectValue placeholder="Filtrar por mês" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="all">Todos os meses</SelectItem>
                {monthOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
        </motion.div>

        {/* Grid */}
        {filteredDebts.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
              <Filter className="w-7 h-7 text-slate-600" />
            </div>
            <p className="text-slate-400 text-sm">{selectedMonthDate ? "Nenhuma dívida pendente neste mês" : "Nenhuma dívida encontrada"}</p>
            <p className="text-slate-600 text-xs mt-1">{selectedMonthDate ? "Ajuste o filtro de mês ou registre novos pagamentos" : "Tente ajustar os filtros ou adicione uma nova dívida"}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filteredDebts.map((debt, i) => (
                <DebtCard key={debt.id} debt={debt} index={i} onClick={() => setSelectedDebt(debt)} />
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
          onAddPayment={() => setShowPaymentForm(true)}
        />
      )}

      {showPaymentForm && selectedDebt && (
        <PaymentForm
          open={showPaymentForm}
          onClose={() => setShowPaymentForm(false)}
          onSave={(data) => createPayment.mutate(data)}
          debt={selectedDebt}
        />
      )}
    </div>
  );
}
