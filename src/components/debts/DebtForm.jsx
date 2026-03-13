import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X } from "lucide-react";

const CATEGORIES = [
  { value: "cartao_credito", label: "Cartão de Crédito" },
  { value: "emprestimo", label: "Empréstimo" },
  { value: "financiamento", label: "Financiamento" },
  { value: "conta_fixa", label: "Conta Fixa" },
  { value: "saude", label: "Saúde" },
  { value: "educacao", label: "Educação" },
  { value: "pessoal", label: "Pessoal" },
  { value: "outro", label: "Outro" },
];

const PRIORITIES = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
  { value: "urgente", label: "Urgente" },
];

const defaultForm = {
  creditor: "", description: "", category: "pessoal", total_amount: "",
  total_installments: "1", installment_amount: "", due_day: "",
  start_date: "", priority: "media", status: "em_dia", notes: "",
  paid_amount: "0", paid_installments: "0",
};

export default function DebtForm({ open, onClose, onSave, editDebt }) {
  const [form, setForm] = useState(editDebt ? {
    ...defaultForm,
    ...editDebt,
    total_amount: String(editDebt.total_amount || ""),
    total_installments: String(editDebt.total_installments || "1"),
    installment_amount: String(editDebt.installment_amount || ""),
    due_day: String(editDebt.due_day || ""),
    paid_amount: String(editDebt.paid_amount || "0"),
    paid_installments: String(editDebt.paid_installments || "0"),
  } : defaultForm);

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

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
    const data = {
      ...form,
      total_amount: parseFloat(form.total_amount) || 0,
      total_installments: parseInt(form.total_installments) || 1,
      installment_amount: parseFloat(form.installment_amount) || 0,
      due_day: parseInt(form.due_day) || undefined,
      paid_amount: parseFloat(form.paid_amount) || 0,
      paid_installments: parseInt(form.paid_installments) || 0,
    };
    onSave(data);
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
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
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