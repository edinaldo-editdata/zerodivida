import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Loader2, Pencil, Trash2, TrendingUp, RefreshCw, Wallet } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useFirebaseRealtime } from "@/hooks/useFirebaseRealtime";
import { useToast } from "@/components/ui/use-toast";
import IncomeForm from "@/components/income/IncomeForm";
import { buildRecurringRecords, DEFAULT_RECURRENCE_MONTHS, ensureDateString } from "@/lib/recurrence";

const CATEGORY_CONFIG = {
  salario:      { label: "Salário",      color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",  dot: "bg-emerald-400" },
  freelance:    { label: "Freelance",    color: "bg-blue-500/15 text-blue-400 border-blue-500/20",           dot: "bg-blue-400" },
  investimento: { label: "Investimento", color: "bg-violet-500/15 text-violet-400 border-violet-500/20",    dot: "bg-violet-400" },
  aluguel:      { label: "Aluguel",      color: "bg-amber-500/15 text-amber-400 border-amber-500/20",       dot: "bg-amber-400" },
  bonus:        { label: "Bônus",        color: "bg-pink-500/15 text-pink-400 border-pink-500/20",          dot: "bg-pink-400" },
  presente:     { label: "Presente",     color: "bg-rose-500/15 text-rose-400 border-rose-500/20",          dot: "bg-rose-400" },
  venda:        { label: "Venda",        color: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",          dot: "bg-cyan-400" },
  reembolso:    { label: "Reembolso",    color: "bg-orange-500/15 text-orange-400 border-orange-500/20",    dot: "bg-orange-400" },
  personalizado: { label: "Personalizado", color: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20", dot: "bg-indigo-400" },
  outro:        { label: "Outro",        color: "bg-slate-500/15 text-slate-400 border-slate-500/20",       dot: "bg-slate-400" },
};

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

function getMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonth(date) {
  return format(date, "MMM yyyy", { locale: ptBR }).replace(".", "");
}

export default function Incomes() {
  const FILTER_STORAGE_KEY = "incomes_filters";

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editIncome, setEditIncome] = useState(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useFirebaseRealtime("Income", ["incomes"], "-date");

  const { data: incomes = [], isLoading } = useQuery({
    queryKey: ["incomes"],
    queryFn: () => base44.entities.Income.list("-date"),
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(FILTER_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.search) setSearch(parsed.search);
        if (parsed.categoryFilter) setCategoryFilter(parsed.categoryFilter);
        if (parsed.yearFilter) setYearFilter(parsed.yearFilter);
        if (parsed.monthFilter) setMonthFilter(parsed.monthFilter);
      }
    } catch (error) {
      console.error("Erro ao carregar filtros de entradas", error);
    }
  }, []);

  const createRecurringInstances = async (incomeData) => {
    const normalizedDay = incomeData.recurrent_day || new Date(incomeData.date).getDate();
    const { records } = buildRecurringRecords({
      ...incomeData,
      recurrent: true,
      recurrent_day: normalizedDay,
      recurrence_start_date: incomeData.date,
    }, DEFAULT_RECURRENCE_MONTHS);

    const [masterPayload, ...futurePayloads] = records;
    const master = await base44.entities.Income.create({
      ...masterPayload,
      is_recurrence_instance: false,
    });

    const restResults = await Promise.allSettled(
      futurePayloads.map(payload => base44.entities.Income.create({
        ...payload,
        origin_income_id: master.id,
      })),
    );

    const successes = restResults.filter(r => r.status === "fulfilled").length;
    const failures = restResults.length - successes;

    if (failures > 0) {
      console.error("Falha ao criar algumas parcelas recorrentes", restResults);
    }

    return {
      master,
      createdCount: 1 + successes,
      failedCount: failures,
    };
  };

  const updateFutureInstances = async (income, payload) => {
    const recurrenceId = income.recurrence_id;
    if (!recurrenceId) {
      return { updated: 0, failed: 0 };
    }

    const currentOffset = income.recurrence_offset || 0;
    const totalMonths = income.recurrence_months || DEFAULT_RECURRENCE_MONTHS;
    const monthsRemaining = Math.max(totalMonths - currentOffset, 1);
    const normalizedDay = payload.recurrent_day || new Date(payload.date).getDate();

    const { records } = buildRecurringRecords({
      ...payload,
      recurrent_day: normalizedDay,
      recurrence_id: recurrenceId,
      recurrence_start_date: income.recurrence_start_date || ensureDateString(income.date),
    }, monthsRemaining, currentOffset);

    const targets = incomes
      .filter(item => item.recurrence_id === recurrenceId && (item.recurrence_offset || 0) >= currentOffset)
      .sort((a, b) => (a.recurrence_offset || 0) - (b.recurrence_offset || 0));

    const updates = targets.map(target => {
      const record = records.find(r => r.recurrence_offset === target.recurrence_offset);
      const payloadToSend = record ? record : {
        ...payload,
        date: ensureDateString(target.date),
        recurrence_id: recurrenceId,
        recurrence_offset: target.recurrence_offset,
        recurrence_months: totalMonths,
        recurrence_start_date: income.recurrence_start_date || ensureDateString(income.date),
        is_recurrence_instance: target.is_recurrence_instance,
      };
      return base44.entities.Income.update(target.id, {
        ...payloadToSend,
        is_recurrence_instance: target.is_recurrence_instance || payloadToSend.is_recurrence_instance,
        origin_income_id: target.origin_income_id || income.id,
      });
    });

    const results = await Promise.allSettled(updates);
    const successes = results.filter(r => r.status === "fulfilled").length;
    const failures = results.length - successes;

    if (failures > 0) {
      console.error("Falha ao atualizar parcelas futuras", results);
    }

    return { updated: successes, failed: failures };
  };

  const createIncome = useMutation({
    mutationFn: async (data) => {
      if (data.recurrent) {
        return createRecurringInstances(data);
      }
      const created = await base44.entities.Income.create(data);
      return { master: created, createdCount: 1, failedCount: 0 };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["incomes"] });
      setShowForm(false);
      setEditIncome(null);
      toast({
        title: "Entrada criada",
        description: result?.failedCount
          ? `Algumas parcelas não foram geradas (${result.failedCount}). Verifique sua lista.`
          : result?.createdCount > 1
            ? `${result.createdCount} parcelas recorrentes adicionadas.`
            : "Lançamento registrado com sucesso.",
      });
    },
    onError: () => {
      toast({ title: "Erro ao salvar", description: "Não foi possível registrar a entrada.", variant: "destructive" });
    },
  });

  const updateIncome = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Income.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incomes"] });
      setShowForm(false);
      setEditIncome(null);
      toast({ title: "Entrada atualizada", description: "Alterações salvas." });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar", description: "Revise os dados e tente novamente.", variant: "destructive" });
    },
  });

  const updateRecurrence = useMutation({
    mutationFn: ({ income, data }) => updateFutureInstances(income, data),
    onSuccess: ({ updated, failed }) => {
      queryClient.invalidateQueries({ queryKey: ["incomes"] });
      setShowForm(false);
      setEditIncome(null);
      toast({
        title: "Série atualizada",
        description: failed > 0
          ? `${updated} parcelas ajustadas, ${failed} falharam. Verifique a lista.`
          : `${updated} parcelas futuras ajustadas.`,
      });
    },
    onError: () => {
      toast({ title: "Erro na série", description: "Não foi possível atualizar as parcelas futuras.", variant: "destructive" });
    },
  });

  const deleteIncome = useMutation({
    mutationFn: (id) => base44.entities.Income.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incomes"] });
      toast({ title: "Entrada removida", description: "O lançamento foi excluído." });
    },
    onError: () => {
      toast({ title: "Erro ao remover", description: "Não foi possível excluir a entrada.", variant: "destructive" });
    },
  });

  const handleSave = async (data, options = {}) => {
    try {
      if (editIncome) {
        if (options.scope === "future" && editIncome.recurrence_id) {
          await updateRecurrence.mutateAsync({ income: editIncome, data });
        } else {
          await updateIncome.mutateAsync({ id: editIncome.id, data });
        }
      } else {
        await createIncome.mutateAsync(data);
      }
    } catch (error) {
      console.error("Erro ao salvar entrada", error);
    }
  };

  const periodFiltered = useMemo(() => incomes.filter(i => {
    if (yearFilter === "all" && monthFilter === "all") return true;
    const d = new Date(i.date);
    if (Number.isNaN(d.getTime())) return false;
    if (yearFilter !== "all" && String(d.getFullYear()) !== yearFilter) return false;
    if (monthFilter !== "all" && getMonthKey(d) !== monthFilter) return false;
    return true;
  }), [incomes, yearFilter, monthFilter]);

  const filtered = useMemo(() => periodFiltered.filter(i => {
    const matchSearch = !search || i.description?.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "all" || 
                    i.category === categoryFilter || 
                    (i.category === "personalizado" && i.custom_category === categoryFilter);
    return matchSearch && matchCat;
  }), [periodFiltered, search, categoryFilter]);

  const existingCustomCategories = useMemo(() => {
    const categories = incomes
      .filter(i => i.category === "personalizado" && i.custom_category)
      .map(i => i.custom_category);
    return Array.from(new Set(categories)).sort();
  }, [incomes]);

  const yearOptions = useMemo(() => {
    const years = new Set();
    incomes.forEach(income => {
      if (!income?.date) return;
      const d = new Date(income.date);
      if (!Number.isNaN(d.getTime())) {
        years.add(String(d.getFullYear()));
      }
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [incomes]);

  const allMonthOptions = useMemo(() => {
    const map = new Map();
    incomes.forEach(income => {
      if (!income?.date) return;
      const d = new Date(income.date);
      if (Number.isNaN(d.getTime())) return;
      const key = getMonthKey(d);
      if (!map.has(key)) {
        map.set(key, { value: key, label: formatMonth(new Date(d.getFullYear(), d.getMonth(), 1)), year: String(d.getFullYear()) });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.value.localeCompare(a.value));
  }, [incomes]);

  const monthOptions = useMemo(() => {
    if (yearFilter === "all") return allMonthOptions;
    return allMonthOptions.filter(opt => opt.year === yearFilter);
  }, [allMonthOptions, yearFilter]);

  useEffect(() => {
    if (yearFilter === "all") return;
    if (monthFilter === "all") return;
    const selected = monthOptions.some(opt => opt.value === monthFilter);
    if (!selected) {
      setMonthFilter("all");
    }
  }, [yearFilter, monthFilter, monthOptions]);

  const totalMonth = useMemo(() => {
    const now = new Date();
    return incomes
      .filter(i => {
        const d = new Date(i.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, i) => s + (i.amount || 0), 0);
  }, [incomes]);

  const totalAll = useMemo(() => incomes.reduce((s, i) => s + (i.amount || 0), 0), [incomes]);

  const upcomingRecurrenceTotal = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return incomes
      .filter(i => i.recurrence_id && new Date(i.date) >= today)
      .reduce((sum, income) => sum + (income.amount || 0), 0);
  }, [incomes]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload = {
      search,
      categoryFilter,
      yearFilter,
      monthFilter,
    };
    try {
      localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.error("Erro ao salvar filtros de entradas", error);
    }
  }, [search, categoryFilter, yearFilter, monthFilter]);

  const handleClearFilters = () => {
    setSearch("");
    setCategoryFilter("all");
    setYearFilter("all");
    setMonthFilter("all");
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

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-emerald-200 text-xs sm:text-sm px-4 py-3 mb-6">
          Entradas marcadas como recorrentes geram 12 lançamentos independentes. Ajuste cada parcela ou aplique
          mudanças em cadeia usando o campo "Aplicar alterações" ao editar.
        </motion.div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[
            { label: "Esse Mês", value: totalMonth, icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { label: "Total Registrado", value: totalAll, icon: Wallet, color: "text-blue-400", bg: "bg-blue-500/10" },
            { label: "Recorrências Futuras", value: upcomingRecurrenceTotal, icon: RefreshCw, color: "text-violet-400", bg: "bg-violet-500/10" },
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
        <div className="flex flex-col lg:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar entradas..."
              className="pl-9 bg-white/[0.03] border-white/[0.08] text-white placeholder:text-slate-500" />
          </div>
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
            <SelectTrigger className="w-full sm:w-44 bg-white/[0.03] border-white/[0.08] text-white">
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              <SelectItem value="all">Todos os meses</SelectItem>
              {monthOptions.length === 0 && yearFilter !== "all" && (
                <SelectItem value="__no_month" disabled>
                  Nenhum mês disponível
                </SelectItem>
              )}
              {monthOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-44 bg-white/[0.03] border-white/[0.08] text-white">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
              {existingCustomCategories.length > 0 && (
                <>
                  <SelectSeparator className="bg-white/10" />
                  <SelectGroup>
                    <SelectLabel className="text-indigo-400">Suas Categorias</SelectLabel>
                    {existingCustomCategories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectGroup>
                </>
              )}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" onClick={handleClearFilters}
            className="w-full sm:w-auto border-white/15 text-slate-200 hover:text-white">
            Limpar filtros
          </Button>
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
                const isCustom = income.category === "personalizado" && income.custom_category;
                const cat = isCustom 
                  ? { ...CATEGORY_CONFIG.personalizado, label: income.custom_category }
                  : (CATEGORY_CONFIG[income.category] || CATEGORY_CONFIG.outro);
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
                              <RefreshCw className="w-2.5 h-2.5" />
                              {income.recurrence_id
                                ? `Parcela ${(income.recurrence_offset || 0) + 1}/${income.recurrence_months || DEFAULT_RECURRENCE_MONTHS}`
                                : "Recorrente"}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                          <Badge variant="secondary" className={`text-[10px] border ${cat.color}`}>{cat.label}</Badge>
                          <span className="text-xs text-slate-500">
                            {format(new Date(income.date), "dd MMM yyyy", { locale: ptBR })}
                          </span>
                          {income.recurrence_id && (
                            <span className="text-[10px] text-slate-500">Série #{income.recurrence_id.slice(-4)}</span>
                          )}
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
          existingCustomCategories={existingCustomCategories}
        />
      )}
    </div>
  );
}
