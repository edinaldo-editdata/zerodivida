import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const METHODS = [
  { value: "pix", label: "PIX" },
  { value: "boleto", label: "Boleto" },
  { value: "debito", label: "Débito" },
  { value: "credito", label: "Crédito" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "transferencia", label: "Transferência" },
  { value: "outro", label: "Outro" },
];

export default function PaymentForm({ open, onClose, onSave, debt }) {
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    amount: String(debt?.installment_amount || ""),
    payment_date: today,
    method: "pix",
    installment_number: String((debt?.paid_installments || 0) + 1),
    notes: "",
  });

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      debt_id: debt.id,
      amount: parseFloat(form.amount) || 0,
      payment_date: form.payment_date,
      method: form.method,
      installment_number: parseInt(form.installment_number) || 1,
      notes: form.notes,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Registrar Pagamento</DialogTitle>
          <p className="text-sm text-slate-400">{debt?.creditor}</p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-400">Valor *</Label>
              <Input type="number" step="0.01" value={form.amount} onChange={e => handleChange("amount", e.target.value)} required className="bg-white/5 border-white/10 text-white mt-1" />
            </div>
            <div>
              <Label className="text-xs text-slate-400">Data *</Label>
              <Input type="date" value={form.payment_date} onChange={e => handleChange("payment_date", e.target.value)} required className="bg-white/5 border-white/10 text-white mt-1" />
            </div>
            <div>
              <Label className="text-xs text-slate-400">Método</Label>
              <Select value={form.method} onValueChange={v => handleChange("method", v)}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-400">Parcela Nº</Label>
              <Input type="number" value={form.installment_number} onChange={e => handleChange("installment_number", e.target.value)} className="bg-white/5 border-white/10 text-white mt-1" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs text-slate-400">Observações</Label>
              <Input value={form.notes} onChange={e => handleChange("notes", e.target.value)} placeholder="Opcional" className="bg-white/5 border-white/10 text-white mt-1" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} className="text-slate-400 hover:text-white">Cancelar</Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">Confirmar Pagamento</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}