import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";


const BASE_CATEGORIES = [
  { value: "cartao_credito", label: "Cartão de Crédito" },
  { value: "emprestimo", label: "Empréstimo" },
  { value: "financiamento", label: "Financiamento" },
  { value: "conta_fixa", label: "Conta Fixa" },
  { value: "saude", label: "Saúde" },
  { value: "educacao", label: "Educação" },
  { value: "pessoal", label: "Pessoal" },
  { value: "outro", label: "Outro" },
];

const CUSTOM_CATEGORIES_KEY = "debt_custom_categories";

const PRIORITIES = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
  { value: "urgente", label: "Urgente" },
];

const RECURRENCE_OPTIONS = [
  { value: "none", label: "Não recorrente" },
  { value: "daily", label: "Diária" },
  { value: "weekly", label: "Semanal" },
  { value: "biweekly", label: "Quinzenal" },
  { value: "monthly", label: "Mensal" },
  { value: "bimonthly", label: "Bimestral" },
  { value: "quarterly", label: "Trimestral" },
  { value: "semiannual", label: "Semestral" },
  { value: "annual", label: "Anual" },
];

const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const normalizeDate = (value) => {
  if (!value) return "";
  
  // Se já estiver no formato ISO (YYYY-MM-DD), retorna como está
  if (ISO_DATE_ONLY.test(value)) return value;
  
  // Se for string com datetime (ex: 2025-05-20T00:00:00.000Z), extrai apenas a data
  if (typeof value === "string") {
    const datePart = value.split("T")[0];
    if (ISO_DATE_ONLY.test(datePart)) return datePart;
  }
  
  // Se for objeto Date ou timestamp, converte para YYYY-MM-DD no timezone local
  const date = new Date(value);
  if (isNaN(date.getTime())) return "";
  
  // Extrai ano, mês e dia usando métodos locais (não UTC)
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  
  return `${year}-${month}-${day}`;
};

const defaultForm = {
  creditor: "", description: "", category: "pessoal", total_amount: "",
  total_installments: "1", installment_amount: "", due_day: "",
  start_date: normalizeDate(new Date().toISOString().split("T")[0]), priority: "media", status: "em_dia", notes: "",
  paid_amount: "0", paid_installments: "0", credit_card_id: "",
  recurrence: "none", recurrence_count: "",
};

export default function DebtForm({ open, onClose, onSave, editDebt, creditCards = [] }) {
  const [form, setForm] = useState(editDebt ? {
    ...defaultForm,
    ...editDebt,
    total_amount: String(editDebt.total_amount || ""),
    total_installments: String(editDebt.total_installments || "1"),
    installment_amount: String(editDebt.installment_amount || ""),
    due_day: String(editDebt.due_day || ""),
    paid_amount: String(editDebt.paid_amount || "0"),
    paid_installments: String(editDebt.paid_installments || "0"),
    credit_card_id: editDebt.credit_card_id || "",
    start_date: editDebt.start_date ? normalizeDate(editDebt.start_date) : normalizeDate(new Date().toISOString().split("T")[0]),
    recurrence: editDebt.recurrence || "none",
    recurrence_count: String(editDebt.recurrence_count || ""),
  } : defaultForm);

  const [customCategories, setCustomCategories] = useState(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(CUSTOM_CATEGORIES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Erro ao carregar categorias personalizadas", error);
      return [];
    }
  });
  const [newCategory, setNewCategory] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(customCategories));
    } catch (error) {
      console.error("Erro ao salvar categorias personalizadas", error);
    }
  }, [customCategories]);

  const formatCategoryLabel = (value) => value
    .split(/[_-]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  const categoryOptions = [...BASE_CATEGORIES, ...customCategories];

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const slugifyCategory = (label) => label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    || "categoria_personalizada";

  const handleAddCustomCategory = () => {
    const label = newCategory.trim();
    if (!label) return;
    const value = slugifyCategory(label);
    if (!categoryOptions.some(cat => cat.value === value)) {
      setCustomCategories(prev => [...prev, { value, label }]);
    }
    setForm(prev => ({ ...prev, category: value }));
    setNewCategory("");
  };

  useEffect(() => {
    if (!form.category) return;
    const exists = categoryOptions.some(cat => cat.value === form.category);
    if (!exists) {
      const label = formatCategoryLabel(form.category);
      setCustomCategories(prev => [...prev, { value: form.category, label }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.category]);

  // Cálculo automático de valores
  useEffect(() => {
    const total = parseFloat(form.total_amount) || 0;
    const installments = parseInt(form.total_installments) || 1;
    const installmentValue = parseFloat(form.installment_amount) || 0;

    // Se total e parcelas estão preenchidos, calcula valor da parcela
    if (total > 0 && installments > 0 && form.total_amount && !form._manualInstallment) {
      const calculated = total / installments;
      if (Math.abs(installmentValue - calculated) > 0.01) {
        setForm(prev => ({ ...prev, installment_amount: calculated.toFixed(2), _manualInstallment: false }));
      }
    }
    
    // Se valor da parcela e parcelas estão preenchidos, calcula total
    if (installmentValue > 0 && installments > 0 && form.installment_amount && form._manualInstallment) {
      const calculated = installmentValue * installments;
      if (Math.abs(total - calculated) > 0.01) {
        setForm(prev => ({ ...prev, total_amount: calculated.toFixed(2) }));
      }
    }
  }, [form.total_amount, form.total_installments, form.installment_amount, form._manualInstallment]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      creditor: form.creditor,
      description: form.description,
      category: form.category,
      total_amount: parseFloat(form.total_amount) || 0,
      total_installments: parseInt(form.total_installments, 10) || 1,
      installment_amount: parseFloat(form.installment_amount) || 0,
      due_day: form.due_day ? parseInt(form.due_day, 10) : null,
      start_date: form.start_date || null,
      priority: form.priority,
      status: form.status,
      notes: form.notes,
      paid_amount: parseFloat(form.paid_amount) || 0,
      paid_installments: parseInt(form.paid_installments, 10) || 0,
      credit_card_id: form.credit_card_id || null,
      recurrence: form.recurrence !== "none" ? form.recurrence : null,
      recurrence_count: form.recurrence_count ? parseInt(form.recurrence_count, 10) : null,
    };
    onSave(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-white/10 text-white max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">{editDebt ? "Editar Dívida" : "Nova Dívida"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs text-slate-400">Credor / Instituição *</Label>
              <Input value={form.creditor} onChange={e => handleChange("creditor", e.target.value)} required placeholder="Ex: Nubank" className="bg-white/5 border-white/10 text-white mt-1" />
            </div>
            <div>
              <Label className="text-xs text-slate-400">Categoria</Label>
              <Select value={form.category} onValueChange={v => handleChange("category", v)}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categoryOptions.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label className="text-xs text-slate-400 flex items-center justify-between">
                <span>Nova categoria personalizada</span>
                <span className="text-[10px] text-slate-500">Será salva para próximos usos</span>
              </Label>
              <div className="flex flex-col sm:flex-row gap-2 mt-1">
                <Input
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  placeholder="Ex: Assinaturas de streaming"
                  className="bg-white/5 border-white/10 text-white flex-1"
                />
                <Button type="button" onClick={handleAddCustomCategory} disabled={!newCategory.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white whitespace-nowrap">
                  Adicionar categoria
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-xs text-slate-400">Cartão de Crédito</Label>
              {creditCards.length > 0 ? (
                <Select value={form.credit_card_id || "none"} onValueChange={v => handleChange("credit_card_id", v === "none" ? "" : v)}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1">
                    <SelectValue placeholder="Vincular cartão" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem cartão vinculado</SelectItem>
                    {creditCards.map(card => (
                      <SelectItem key={card.id} value={card.id}>{card.name}{card.last_four ? ` •••• ${card.last_four}` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-xs text-slate-500 mt-2">Cadastre um cartão para vincular esta dívida.</p>
              )}
            </div>
            <div>
              <Label className="text-xs text-slate-400">Prioridade</Label>
              <Select value={form.priority} onValueChange={v => handleChange("priority", v)}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-400">Valor Total *</Label>
              <Input 
                type="number" 
                step="0.01" 
                value={form.total_amount} 
                onChange={e => {
                  handleChange("total_amount", e.target.value);
                  setForm(prev => ({ ...prev, _manualInstallment: false }));
                }} 
                required 
                placeholder="0,00" 
                className="bg-white/5 border-white/10 text-white mt-1" 
              />
            </div>
            <div>
              <Label className="text-xs text-slate-400">Valor da Parcela</Label>
              <Input 
                type="number" 
                step="0.01" 
                value={form.installment_amount} 
                onChange={e => {
                  handleChange("installment_amount", e.target.value);
                  setForm(prev => ({ ...prev, _manualInstallment: true }));
                }} 
                placeholder="0,00" 
                className="bg-white/5 border-white/10 text-white mt-1" 
              />
            </div>
            <div>
              <Label className="text-xs text-slate-400">Total de Parcelas</Label>
              <Input type="number" value={form.total_installments} onChange={e => handleChange("total_installments", e.target.value)} className="bg-white/5 border-white/10 text-white mt-1" />
            </div>
            <div>
              <Label className="text-xs text-slate-400">Parcelas Pagas</Label>
              <Input type="number" value={form.paid_installments} onChange={e => handleChange("paid_installments", e.target.value)} className="bg-white/5 border-white/10 text-white mt-1" />
            </div>
            <div>
              <Label className="text-xs text-slate-400">Dia Vencimento</Label>
              <Input type="number" min="1" max="31" value={form.due_day} onChange={e => handleChange("due_day", e.target.value)} placeholder="Ex: 15" className="bg-white/5 border-white/10 text-white mt-1" />
            </div>
            <div>
              <Label className="text-xs text-slate-400">Data Início</Label>
              <Input type="date" value={form.start_date} onChange={e => handleChange("start_date", e.target.value)} className="bg-white/5 border-white/10 text-white mt-1" />
            </div>
            <div>
              <Label className="text-xs text-slate-400">Valor Já Pago</Label>
              <Input type="number" step="0.01" value={form.paid_amount} onChange={e => handleChange("paid_amount", e.target.value)} className="bg-white/5 border-white/10 text-white mt-1" />
            </div>
            <div>
              <Label className="text-xs text-slate-400">Status</Label>
              <Select value={form.status} onValueChange={v => handleChange("status", v)}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="em_dia">Em Dia</SelectItem>
                  <SelectItem value="atrasada">Atrasada</SelectItem>
                  <SelectItem value="quitada">Quitada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-400">Recorrência</Label>
              <Select value={form.recurrence} onValueChange={v => handleChange("recurrence", v)}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RECURRENCE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.recurrence !== "none" && (
              <div>
                <Label className="text-xs text-slate-400">Número de Ocorrências</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.recurrence_count}
                  onChange={e => handleChange("recurrence_count", e.target.value)}
                  placeholder="Ex: 12 (deixe vazio para indefinido)"
                  className="bg-white/5 border-white/10 text-white mt-1"
                />
                <p className="text-[10px] text-slate-500 mt-1">Quantas vezes esta dívida se repetirá (opcional)</p>
              </div>
            )}
            <div className="col-span-2">
              <Label className="text-xs text-slate-400">Descrição</Label>
              <Input value={form.description} onChange={e => handleChange("description", e.target.value)} placeholder="Descrição breve" className="bg-white/5 border-white/10 text-white mt-1" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs text-slate-400">Observações</Label>
              <Textarea value={form.notes} onChange={e => handleChange("notes", e.target.value)} placeholder="Notas adicionais..." rows={2} className="bg-white/5 border-white/10 text-white mt-1 resize-none" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} className="text-slate-400 hover:text-white">Cancelar</Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">{editDebt ? "Salvar" : "Criar Dívida"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
