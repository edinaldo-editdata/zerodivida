import React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil, Trash2, Plus, Receipt, CreditCard as CreditCardIcon } from "lucide-react";

const CARD_BRANDS = {
  visa: "Visa",
  mastercard: "Mastercard",
  elo: "Elo",
  amex: "Amex",
  hipercard: "Hipercard",
  outro: "Outro",
};

const STATUS_CONFIG = {
  em_dia: { label: "Em dia", class: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  atrasada: { label: "Atrasada", class: "bg-red-500/15 text-red-400 border-red-500/20" },
  quitada: { label: "Quitada", class: "bg-slate-500/15 text-slate-400 border-slate-500/20" },
};

const METHOD_LABELS = {
  pix: "PIX", boleto: "Boleto", debito: "Débito", credito: "Crédito",
  dinheiro: "Dinheiro", transferencia: "Transferência", outro: "Outro",
};

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function getLocalDate(value) {
  if (!value) return null;
  if (ISO_DATE_ONLY.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, (month || 1) - 1, day || 1);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

export default function DebtDetail({
  open,
  onClose,
  debt,
  payments,
  onEdit,
  onDelete,
  onAddPayment,
  onEditPayment = null,
  onDeletePayment = null,
  creditCard = null,
}) {
  if (!debt) return null;
  const status = STATUS_CONFIG[debt.status] || STATUS_CONFIG.em_dia;
  const progress = debt.total_amount > 0 ? Math.min(((debt.paid_amount || 0) / debt.total_amount) * 100, 100) : 0;
  const remaining = (debt.total_amount || 0) - (debt.paid_amount || 0);
  const debtPayments = payments.filter(p => p.debt_id === debt.id).sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-white/10 text-white max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">{debt.creditor}</DialogTitle>
            <Badge variant="secondary" className={`text-xs border ${status.class}`}>{status.label}</Badge>
          </div>
          {debt.description && <p className="text-sm text-slate-400 mt-1">{debt.description}</p>}
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Progress */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-400">Progresso</span>
              <span className="text-white font-medium">{Math.round(progress)}%</span>
            </div>
            <div className="h-2.5 bg-white/[0.06] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8 }}
                className="h-full bg-gradient-to-r from-emerald-400 to-green-500 rounded-full"
              />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Total", value: formatCurrency(debt.total_amount) },
              { label: "Pago", value: formatCurrency(debt.paid_amount || 0) },
              { label: "Restante", value: formatCurrency(remaining) },
            ].map(stat => (
              <div key={stat.label} className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-center">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">{stat.label}</p>
                <p className="text-sm font-bold text-white mt-1">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {debt.total_installments > 1 && (
              <div>
                <p className="text-xs text-slate-500">Parcelas</p>
                <p className="text-white">{debt.paid_installments || 0} / {debt.total_installments}</p>
              </div>
            )}
            {debt.installment_amount > 0 && (
              <div>
                <p className="text-xs text-slate-500">Valor Parcela</p>
                <p className="text-white">{formatCurrency(debt.installment_amount)}</p>
              </div>
            )}
            {debt.due_day && (
              <div>
                <p className="text-xs text-slate-500">Vencimento</p>
                <p className="text-white">Dia {debt.due_day}</p>
              </div>
            )}
            {debt.start_date && (
              <div>
                <p className="text-xs text-slate-500">Início</p>
                <p className="text-white">{format(getLocalDate(debt.start_date) || new Date(), "dd/MM/yyyy")}</p>
              </div>
            )}
          </div>

          {creditCard && (
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
              <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider">Cartão vinculado</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
                  <CreditCardIcon className="w-5 h-5 text-white/80" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{creditCard.name}</p>
                  <p className="text-xs text-slate-500">{CARD_BRANDS[creditCard.brand] || "Cartão"}{creditCard.last_four ? ` • •••• ${creditCard.last_four}` : ""}</p>
                  <p className="text-[11px] text-slate-500">Fecha dia {creditCard.closing_day || "-"} • Paga dia {creditCard.due_day || "-"}</p>
                </div>
              </div>
            </div>
          )}

          {debt.notes && (
            <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3">
              <p className="text-xs text-slate-500 mb-1">Observações</p>
              <p className="text-sm text-slate-300">{debt.notes}</p>
            </div>
          )}

          {/* Payments History */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-slate-300">Histórico de Pagamentos</h4>
              {debt.status !== "quitada" && (
                <Button size="sm" onClick={onAddPayment} className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs">
                  <Plus className="w-3 h-3 mr-1" /> Pagar
                </Button>
              )}
            </div>
            {debtPayments.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">Nenhum pagamento registrado</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {debtPayments.map((p, i) => {
                  const parsedDate = getLocalDate(p.payment_date);
                  const fallbackDate = new Date(p.payment_date);
                  const dateToFormat = parsedDate || (Number.isNaN(fallbackDate.getTime()) ? new Date() : fallbackDate);
                  return (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                          <Receipt className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{formatCurrency(p.amount)}</p>
                          <p className="text-xs text-slate-500">
                            {format(dateToFormat, "dd MMM yyyy", { locale: ptBR })}
                            {p.method && ` • ${METHOD_LABELS[p.method] || p.method}`}
                            {p.installment_number && ` • Parcela ${p.installment_number}`}
                          </p>
                        </div>
                      </div>
                      {(onEditPayment || onDeletePayment) && (
                        <div className="flex items-center gap-1.5">
                          {onEditPayment && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="text-slate-400 hover:text-white"
                              onClick={() => onEditPayment(p)}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span className="sr-only">Editar pagamento</span>
                            </Button>
                          )}
                          {onDeletePayment && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="text-red-400 hover:text-red-200"
                              onClick={() => onDeletePayment(p)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="sr-only">Excluir pagamento</span>
                            </Button>
                          )}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-2 border-t border-white/[0.06]">
            <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
              <Trash2 className="w-4 h-4 mr-1" /> Excluir
            </Button>
            <Button size="sm" onClick={onEdit} variant="outline" className="border-white/10 text-slate-300 hover:text-white">
              <Pencil className="w-4 h-4 mr-1" /> Editar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
