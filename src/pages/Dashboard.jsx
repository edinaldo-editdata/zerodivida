import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useFirebaseRealtime } from "@/hooks/useFirebaseRealtime"; // Adicionado

import SummaryCards from "@/components/dashboard/SummaryCards";
import DebtChart from "@/components/dashboard/DebtChart";
import UpcomingPayments from "@/components/dashboard/UpcomingPayments";
import MonthlyDebtChart from "@/components/dashboard/MonthlyDebtChart";
import DebtForm from "@/components/debts/DebtForm";
import DebtDetail from "@/components/debts/DebtDetail";
import PaymentForm from "@/components/debts/PaymentForm";

export default function Dashboard() {
  const [showForm, setShowForm] = useState(false);
  const [editDebt, setEditDebt] = useState(null);
  const [selectedDebt, setSelectedDebt] = useState(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const queryClient = useQueryClient();

  // Ativa Realtime
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
      setShowPaymentForm(false);
    },
  });

  const creditCardMap = useMemo(() => {
    const map = new Map();
    creditCards.forEach(card => {
      if (card?.id) map.set(card.id, card);
    });
    return map;
  }, [creditCards]);

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
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Minhas <span className="text-emerald-400">Dívidas</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">Controle e organize suas finanças pessoais</p>
          </div>
          <Button
            onClick={() => { setEditDebt(null); setShowForm(true); }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-900/30"
          >
            <Plus className="w-4 h-4 mr-2" /> Nova Dívida
          </Button>
        </motion.div>

        {/* Summary */}
        <div className="mb-8">
          <SummaryCards debts={debts} />
        </div>

        {/* Charts & Upcoming */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <DebtChart debts={debts} />
          <UpcomingPayments debts={debts} onSelect={setSelectedDebt} />
        </div>

        {/* Monthly Projection */}
        <div className="mb-8">
          <MonthlyDebtChart debts={debts} />
        </div>

        {/* Recent Debts */}
        {debts.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">Dívidas Recentes</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {debts.slice(0, 6).map((debt, i) => {
                const progress = debt.total_amount > 0 ? Math.min(((debt.paid_amount || 0) / debt.total_amount) * 100, 100) : 0;
                const remaining = (debt.total_amount || 0) - (debt.paid_amount || 0);
                return (
                  <motion.div
                    key={debt.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => setSelectedDebt(debt)}
                    className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 hover:bg-white/[0.06] cursor-pointer transition-all group"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors">{debt.creditor}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        debt.status === "quitada" ? "bg-slate-500/20 text-slate-400" :
                        debt.status === "atrasada" ? "bg-red-500/20 text-red-400" :
                        "bg-emerald-500/15 text-emerald-400"
                      }`}>
                        {debt.status === "em_dia" ? "Em dia" : debt.status === "atrasada" ? "Atrasada" : "Quitada"}
                      </span>
                    </div>
                    <p className="text-lg font-bold text-white">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(remaining)}</p>
                    <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden mt-3">
                      <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 text-right">{Math.round(progress)}% pago</p>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
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
          onAddPayment={() => setShowPaymentForm(true)}
          creditCard={selectedDebt ? creditCardMap.get(selectedDebt.credit_card_id) : null}
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
