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

export default function Debts() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
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

  const filteredDebts = useMemo(() => {
    return debts.filter(d => {
      const matchSearch = !search || d.creditor?.toLowerCase().includes(search.toLowerCase()) || d.description?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || d.status === statusFilter;
      const matchCategory = categoryFilter === "all" || d.category === categoryFilter;
      return matchSearch && matchStatus && matchCategory;
    });
  }, [debts, search, statusFilter, categoryFilter]);

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
              <SelectItem value="em_dia">Em dia</SelectItem>
              <SelectItem value="atrasada">Atrasada</SelectItem>
              <SelectItem value="quitada">Quitada</SelectItem>
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
            <p className="text-slate-400 text-sm">Nenhuma dívida encontrada</p>
            <p className="text-slate-600 text-xs mt-1">Tente ajustar os filtros ou adicione uma nova dívida</p>
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