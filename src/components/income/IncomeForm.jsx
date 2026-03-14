import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

const CATEGORIES = [
  { value: "salario", label: "Salário" },
  { value: "freelance", label: "Freelance" },
  { value: "investimento", label: "Investimento" },
  { value: "aluguel", label: "Aluguel" },
  { value: "bonus", label: "Bônus" },
  { value: "presente", label: "Presente" },
  { value: "venda", label: "Venda" },
  { value: "reembolso", label: "Reembolso" },
  { value: "personalizado", label: "Item Personalizado" },
  { value: "outro", label: "Outro" },
];

const defaultForm = {
  description: "",
  amount: "",
  date: new Date().toISOString().split("T")[0],
  category: "salario",
  custom_category: "",
  recurrent: false,
  recurrent_day: "",
  notes: "",
};

export default function IncomeForm({ open, onClose, onSave, editIncome, existingCustomCategories = [] }) {
  const [form, setForm] = useState(defaultForm);
  const [updateScope, setUpdateScope] = useState("single");

  useEffect(() => {
    if (editIncome) {
      setForm({
        ...defaultForm,
        ...editIncome,
        amount: String(editIncome.amount || ""),
        category: (editIncome.category === "personalizado" && editIncome.custom_category)
          ? `custom:${editIncome.custom_category}`
          : (editIncome.category || "salario"),
        custom_category: editIncome.custom_category || "",
        recurrent_day: String(editIncome.recurrent_day || ""),
      });
      setUpdateScope("single");
    } else {
      setForm(defaultForm);
      setUpdateScope("single");
    }
  }, [editIncome, open]);

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const recurringDayValue = form.recurrent ? parseInt(form.recurrent_day, 10) || null : null;
    const payload = {
      description: form.description,
      amount: parseFloat(form.amount) || 0,
      date: form.date || new Date().toISOString().split("T")[0],
      category: form.category.startsWith("custom:") ? "personalizado" : form.category,
      custom_category: form.category.startsWith("custom:") 
        ? form.category.replace("custom:", "") 
        : (form.category === "personalizado" ? form.custom_category : null),
      recurrent: !!form.recurrent,
      recurrent_day: recurringDayValue,
      notes: form.notes,
    };
    const scope = editIncome?.recurrence_id ? updateScope : "single";
    onSave(payload, { scope });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {editIncome ? "Editar Entrada" : "Nova Entrada"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs text-slate-400">Descrição *</Label>
              <Input
                value={form.description}
                onChange={e => handleChange("description", e.target.value)}
                required
                placeholder="Ex: Salário de Janeiro"
                className="bg-white/5 border-white/10 text-white mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-400">Valor *</Label>
              <Input
                type="number"
                step="0.01"
                value={form.amount}
                onChange={e => handleChange("amount", e.target.value)}
                required
                placeholder="0,00"
                className="bg-white/5 border-white/10 text-white mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-400">Data *</Label>
              <Input
                type="date"
                value={form.date}
                onChange={e => handleChange("date", e.target.value)}
                required
                className="bg-white/5 border-white/10 text-white mt-1"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs text-slate-400">Categoria</Label>
              <Select value={form.category} onValueChange={v => handleChange("category", v)}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                  {existingCustomCategories.length > 0 && (
                    <>
                      <SelectSeparator className="bg-white/10" />
                      <SelectGroup>
                        <SelectLabel className="text-indigo-400">Suas Categorias</SelectLabel>
                        {existingCustomCategories.map(cat => (
                          <SelectItem key={cat} value={`custom:${cat}`}>{cat}</SelectItem>
                        ))}
                      </SelectGroup>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            {form.category === "personalizado" && (
              <div className="col-span-2">
                <Label className="text-xs text-slate-400 font-medium text-indigo-400">Nome da Nova Categoria *</Label>
                <div className="relative mt-1">
                  <Input
                    value={form.custom_category}
                    onChange={e => handleChange("custom_category", e.target.value)}
                    required
                    placeholder="Ex: Aluguel de Equipamento"
                    className="bg-indigo-500/5 border-indigo-500/20 text-white"
                  />
                </div>
              </div>
            )}
            <div className="col-span-2 flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div>
                <p className="text-sm text-white">Entrada recorrente</p>
                <p className="text-xs text-slate-500">Repete por 12 meses automaticamente</p>
              </div>
              <Switch
                checked={form.recurrent}
                onCheckedChange={v => handleChange("recurrent", v)}
              />
            </div>
            {form.recurrent && (
              <div className="col-span-2">
                <Label className="text-xs text-slate-400">Dia do recebimento</Label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={form.recurrent_day}
                  onChange={e => handleChange("recurrent_day", e.target.value)}
                  placeholder="Ex: 5"
                  className="bg-white/5 border-white/10 text-white mt-1"
                />
              </div>
            )}
            {editIncome?.recurrence_id && (
              <div className="col-span-2">
                <Label className="text-xs text-slate-400">Aplicar alterações</Label>
                <Select value={updateScope} onValueChange={setUpdateScope}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Somente esta parcela</SelectItem>
                    <SelectItem value="future">Esta e as futuras</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="col-span-2">
              <Label className="text-xs text-slate-400">Observações</Label>
              <Textarea
                value={form.notes}
                onChange={e => handleChange("notes", e.target.value)}
                placeholder="Opcional..."
                rows={2}
                className="bg-white/5 border-white/10 text-white mt-1 resize-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} className="text-slate-400 hover:text-white">
              Cancelar
            </Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {editIncome ? "Salvar" : "Adicionar Entrada"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
