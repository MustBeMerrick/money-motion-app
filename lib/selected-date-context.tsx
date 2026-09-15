"use client";

import { createContext, ReactNode, useContext, useState } from "react";

// Lets the calendar's day-selection reach the sidebar's single global Add
// Transaction button, so it can default to the selected day instead of
// today without adding a second "+" affordance in the calendar itself.
const SelectedDateContext = createContext<{
  selectedDate: string | null;
  setSelectedDate: (date: string | null) => void;
} | null>(null);

export function SelectedDateProvider({ children }: { children: ReactNode }) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  return (
    <SelectedDateContext.Provider value={{ selectedDate, setSelectedDate }}>{children}</SelectedDateContext.Provider>
  );
}

export function useSelectedDate() {
  const ctx = useContext(SelectedDateContext);
  if (!ctx) throw new Error("useSelectedDate must be used within a SelectedDateProvider");
  return ctx;
}
