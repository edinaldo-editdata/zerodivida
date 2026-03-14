import { addMonths, lastDayOfMonth } from "date-fns";

const DEFAULT_RECURRENCE_MONTHS = 12;

export function ensureDateString(dateInput) {
  if (!dateInput) {
    return new Date().toISOString().split("T")[0];
  }
  if (typeof dateInput === "string") {
    return dateInput.split("T")[0];
  }
  return dateInput.toISOString().split("T")[0];
}

function clampDayWithinMonth(dateObj, desiredDay) {
  if (!desiredDay) {
    return dateObj;
  }
  const lastDay = lastDayOfMonth(dateObj).getDate();
  const safeDay = Math.min(Math.max(desiredDay, 1), lastDay);
  const cloned = new Date(dateObj.getTime());
  cloned.setDate(safeDay);
  return cloned;
}

export function getDateWithRecurringDay(dateObj, desiredDay) {
  return clampDayWithinMonth(new Date(dateObj.getTime()), desiredDay);
}

export function getRecurrenceId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function buildRecurringRecords(baseIncome, months = DEFAULT_RECURRENCE_MONTHS, offsetBase = 0) {
  const startDate = new Date(baseIncome.date || new Date());
  const recurrenceDay = baseIncome.recurrent_day || startDate.getDate();
  const recurrenceId = baseIncome.recurrence_id || getRecurrenceId();
  const startDateString = ensureDateString(baseIncome.recurrence_start_date) || ensureDateString(startDate);

  const records = Array.from({ length: months }, (_, offset) => {
    const currentDate = addMonths(startDate, offset);
    const adjustedDate = clampDayWithinMonth(currentDate, recurrenceDay);
    return {
      ...baseIncome,
      date: ensureDateString(adjustedDate),
      recurrence_id: recurrenceId,
      recurrence_start_date: startDateString,
      recurrence_months: months,
      recurrence_offset: offsetBase + offset,
      is_recurrence_instance: offsetBase + offset > 0,
    };
  });

  return { recurrenceId, records };
}

export function projectFutureDatesFrom(currentIncome, months = DEFAULT_RECURRENCE_MONTHS) {
  if (!currentIncome?.recurrence_id) {
    return [];
  }
  const startOffset = currentIncome.recurrence_offset || 0;
  const crafted = buildRecurringRecords({
    ...currentIncome,
    recurrence_id: currentIncome.recurrence_id,
    recurrence_start_date: currentIncome.recurrence_start_date || ensureDateString(currentIncome.date),
  }, months - startOffset, startOffset);

  return crafted.records;
}

export { DEFAULT_RECURRENCE_MONTHS };
