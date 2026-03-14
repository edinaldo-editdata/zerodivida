import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const BRAND_OPTIONS = [
  { value: "visa", label: "Visa" },
  { value: "mastercard", label: "Mastercard" },
  { value: "elo", label: "Elo" },
  { value: "amex", label: "American Express" },
  { value: "hipercard", label: "Hipercard" },
  { value: "outro", label: "Outro" },
];

const THEME_OPTIONS = [
  { value: "emerald", label: "Aurora", preview: "from-emerald-500 via-emerald-400 to-lime-400" },
  { value: "violet", label: "Eclipse", preview: "from-violet-500 via-fuchsia-500 to-pink-400" },
  { value: "cyan", label: "Neon", preview: "from-cyan-400 via-teal-400 to-emerald-400" },
  { value: "amber", label: "Solar", preview: "from-amber-500 via-orange-500 to-red-400" },
  { value: "slate", label: "Carbon", preview: "from-slate-800 via-slate-700 to-slate-600" },
];

const DEFAULT_FORM = {
  name: "",
  issuer: "",
  brand: "visa",
  credit_limit: "",
  closing_day: "5",
  due_day: "15",
  last_four: "",
  theme: "emerald",
};

export default function CreditCardForm({ open, onClose, onSave, editCard }) {
  const [form, setForm] = useState(editCard ? { ...DEFAULT_FORM, ...editCard, credit_limit: String(editCard.credit_limit || ""), closing_day: String(editCard.closing_day || ""), due_day: String(editCard.due_day || ""), last_four: editCard.last_four || "" } : { ...DEFAULT_FORM });

  useEffect(() => {
    if (editCard) {
      setForm({
        ...DEFAULT_FORM,
        ...editCard,
        credit_limit: String(editCard.credit_limit || ""),
        closing_day: String(editCard.closing_day || ""),
        due_day: String(editCard.due_day || ""),
        last_four: editCard.last_four || "",
      });
    } else {
      setForm({ ...DEFAULT_FORM });
    }
  }, [editCard, open]);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      credit_limit: parseFloat(form.credit_limit) || 0,
      closing_day: parseInt(form.closing_day, 10) || 1,
      due_day: parseInt(form.due_day, 10) || 10,
      last_four: form.last_four?.slice(-4) || "",
    };
    onSave(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-white/10 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">{editCard ? "Editar Cartão" : "Novo Cartão"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs text-slate-400">Nome do Cartão *</Label>
              <Input value={form.name} onChange={e => handleChange("name", e.target.value)} required placeholder="Ex: Nubank Platinum" className="bg-white/5 border-white/10 text-white mt-1" />
            </div>
            <div>
              <Label className="text-xs text-slate-400">Instituição</Label>
              <Input value={form.issuer} onChange={e => handleChange("issuer", e.target.value)} placeholder="Banco emissor" className="bg-white/5 border-white/10 text-white mt-1" />
            </div>
            <div>
              <Label className="text-xs text-slate-400">Últimos 4 dígitos</Label>
              <Input value={form.last_four} onChange={e => handleChange("last_four", e.target.value.replace(/[^0-9]/g, "").slice(-4))} placeholder="0000" className="bg-white/5 border-white/10 text-white mt-1 tracking-[0.3em]" />
            </div>
            <div>
              <Label className="text-xs text-slate-400">Bandeira</Label>
              <Select value={form.brand} onValueChange={v => handleChange("brand", v)}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BRAND_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-400">Tema</Label>
              <Select value={form.theme} onValueChange={v => handleChange("theme", v)}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {THEME_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label className="text-xs text-slate-400">Limite total</Label>
              <Input type="number" step="0.01" value={form.credit_limit} onChange={e => handleChange("credit_limit", e.target.value)} placeholder="0,00" className="bg-white/5 border-white/10 text-white mt-1" />
            </div>
            <div>
              <Label className="text-xs text-slate-400">Fechamento</Label>
              <Input type="number" min="1" max="31" value={form.closing_day} onChange={e => handleChange("closing_day", e.target.value)} placeholder="Ex: 5" className="bg-white/5 border-white/10 text-white mt-1" />
            </div>
            <div>
              <Label className="text-xs text-slate-400">Vencimento</Label>
              <Input type="number" min="1" max="31" value={form.due_day} onChange={e => handleChange("due_day", e.target.value)} placeholder="Ex: 15" className="bg-white/5 border-white/10 text-white mt-1" />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose} className="text-slate-400 hover:text-white">Cancelar</Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">{editCard ? "Salvar" : "Adicionar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
