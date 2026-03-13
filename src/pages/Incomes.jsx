import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Loader2, Pencil, Trash2, TrendingUp, RefreshCw, Wallet } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import IncomeForm from "@/components/income/IncomeForm";

const CATEGORY_CONFIG = {
  salario:      { label: "Salário",      color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",  dot: "bg-emerald-400" },
  freelance:    { label: "Freelance",    color: "bg-blue-500/15 text-blue-400 border-blue-500/20",           dot: "bg-blue-400" },
  investimento: { label: "Investimento", color: "bg-violet-500/15 text-violet-400 border-violet-500/20",    dot: "bg-violet-400" },
  aluguel:      { label: "Aluguel",      color: "bg-amber-500/15 text-amber-400 border-amber-500/20",       dot: "bg-amber-400" },
  bonus:        { label: "Bônus",        color: "bg-pink-500/15 text-pink-400 border-pink-500/20",          dot: "bg-pink-400" },
  presente:     { label: "Presente",     color: "bg-rose-500/15 text-rose-400 border-rose-500/20",          dot: "bg-rose-400" },
  outro:        { label: "Outro",        color: "bg-slate-500/15 text-slate-400 border-slate-500/20",       dot: "bg-slate-400" },
};

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

export default function Incomes() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editIncome, setEditIncome] = useState(null);
  const queryClient = useQueryClient();

  const { data: incomes = [], isLoading } = useQuery({
    queryKey: ["incomes"],
    queryFn: () => base44.entities.Income.list("-date"),
  });

  const createIncome = useMutation({
    mutationFn: (data) => base44.entities.Income.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["incomes"] }); setShowForm(false); },
  });

  const updateIncome = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Income.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["incomes"] }); setShowForm(false); setEditIncome(null); },
  });

  const deleteIncome = useMutation({
    mutationFn: (id) => base44.entities.Income.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["incomes"] }),
  });

  const handleSave = (data) => {
    if (editIncome) {
      updateIncome.mutate({ id: editIncome.id, data });
    } else {
      createIncome.mutate(data);
    }
  };

  const filtered = useMemo(() => incomes.filter(i => {
    const matchSearch = !search || i.description?.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "all" || i.category === categoryFilter;
    return matchSearch && matchCat;
  }), [incomes, search, categoryFilter]);

  const totalMonth = useMemo(() => {
    const now = new Date();
    return incomes
      .filter(i => {
        const d = new Date(i.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, i) => s + (i.amount || 0), 0);
  }, [incomes]);

  const totalAll = incomes.reduce((s, i) => s + (i.amount || 0), 0);
  const recurrentTotal = incomes.filter(i => i.recurrent).reduce((s, i) => s + (i.amount || 0), 0);

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
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Entradas</h1>
            <p className="text-sm text-slate-500 mt-0.5">{incomes.length} lançamento{incomes.length !== 1 ? "s" : ""} registrado{incomes.length !== 1 ? "s" : ""}</p>
          </div>
          <Button onClick={() => { setEditIncome(null); setShowForm(true); }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="w-4 h-4 mr-2" /> Nova Entrada
          </Button>
        </motion.div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[
            { label: "Esse Mês", value: totalMonth, icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { label: "Total Registrado", value: totalAll, icon: Wallet, color: "text-blue-400", bg: "bg-blue-500/10" },
            { label: "Recorrente/Mês", value: recurrentTotal, icon: RefreshCw, color: "text-violet-400", bg: "bg-violet-500/10" },
          ].map((card, i) => (
            <motion.div key={card.label}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 flex items-center gap-4">
              <div className={`${card.bg} p-2.5 rounded-xl`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-xs text-slate-500">{card.label}</p>
                <p className="text-lg font-bold text-white">{formatCurrency(card.value)}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar entradas..."
              className="pl-9 bg-white/[0.03] border-white/[0.08] text-white placeholder:text-slate-500" />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-44 bg-white/[0.03] border-white/[0.08] text-white">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-7 h-7 text-slate-600" />
            </div>
            <p className="text-slate-400 text-sm">Nenhuma entrada encontrada</p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {filtered.map((income, i) => {
                const cat = CATEGORY_CONFIG[income.category] || CATEGORY_CONFIG.outro;
                return (
                  <motion.div key={income.id}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-all group">
                    <div className="flex items-center gap-4">
                      <div className={`w-2.5 h-2.5 rounded-full ${cat.dot} flex-shrink-0`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-white">{income.description}</p>
                          {income.recurrent && (
                            <span className="flex items-center gap-1 text-[10px] text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded-full">
                              <RefreshCw className="w-2.5 h-2.5" /> Recorrente
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="secondary" className={`text-[10px] border ${cat.color}`}>{cat.label}</Badge>
                          <span className="text-xs text-slate-500">
                            {format(new Date(income.date), "dd MMM yyyy", { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-base font-bold text-emerald-400">{formatCurrency(income.amount)}</p>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditIncome(income); setShowForm(true); }}
                          className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-white transition-all">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteIncome.mutate(income.id)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {showForm && (
        <IncomeForm
          open={showForm}
          onClose={() => { setShowForm(false); setEditIncome(null); }}
          onSave={handleSave}
          editIncome={editIncome}
        />
      )}
    </div>
  );
}