import React from "react";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function parseDate(value) {
  if (!value) return undefined;
  if (ISO_DATE_ONLY.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, (month || 1) - 1, day || 1);
  }
  return new Date(value);
}

function formatDate(date) {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function DatePicker({ value, onChange, placeholder = "Selecione uma data" }) {
  const date = parseDate(value);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start text-left font-normal bg-white/[0.03] border-white/[0.08] text-white hover:bg-white/[0.06] hover:text-white"
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
          {date ? (
            <span className="text-white">{format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
          ) : (
            <span className="text-slate-500">{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-slate-900 border-white/[0.1]" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(newDate) => {
            if (newDate) {
              onChange(formatDate(newDate));
            } else {
              onChange("");
            }
          }}
          locale={ptBR}
          className="text-white"
          classNames={{
            months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
            month: "space-y-4",
            caption: "flex justify-center pt-1 relative items-center",
            caption_label: "text-sm font-medium text-white",
            nav: "space-x-1 flex items-center",
            nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 text-white",
            nav_button_previous: "absolute left-1",
            nav_button_next: "absolute right-1",
            table: "w-full border-collapse space-y-1",
            head_row: "flex",
            head_cell: "text-slate-400 rounded-md w-9 font-normal text-[0.8rem]",
            row: "flex w-full mt-2",
            cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-white/[0.05] [&:has([aria-selected])]:bg-emerald-600 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
            day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 text-white hover:bg-white/[0.1] rounded-md",
            day_range_end: "day-range-end",
            day_selected: "bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white focus:bg-emerald-600 focus:text-white",
            day_today: "bg-white/[0.05] text-white",
            day_outside: "day-outside text-slate-500 opacity-50 aria-selected:bg-white/[0.05] aria-selected:text-slate-500",
            day_disabled: "text-slate-500 opacity-50",
            day_range_middle: "aria-selected:bg-white/[0.1] aria-selected:text-white",
            day_hidden: "invisible",
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
