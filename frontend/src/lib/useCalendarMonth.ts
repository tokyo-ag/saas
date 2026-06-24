'use client';

import { useEffect, useState } from 'react';

export function useCalendarMonth(initialDate?: string | Date | null) {
  const today = new Date();
  const initial = initialDate ? new Date(initialDate) : today;
  const initialValid = Number.isFinite(initial.getTime());
  const [year, setYear] = useState(initialValid ? initial.getFullYear() : today.getFullYear());
  const [month, setMonth] = useState(initialValid ? initial.getMonth() : today.getMonth());
  const initialKey = initialValid ? `${initial.getFullYear()}-${initial.getMonth()}` : '';

  useEffect(() => {
    if (!initialValid) return;
    setYear(initial.getFullYear());
    setMonth(initial.getMonth());
  }, [initialKey, initialValid]);

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  }

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  return { year, month, today, prevMonth, nextMonth, cells, isToday };
}
