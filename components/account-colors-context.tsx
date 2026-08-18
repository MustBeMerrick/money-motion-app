"use client";

import { createContext, useContext } from "react";

export interface AccountColorOption {
  id: string;
  name: string;
  color: string;
  color2: string | null;
}

const AccountColorsContext = createContext<AccountColorOption[]>([]);

export function AccountColorsProvider({
  accounts,
  children,
}: {
  accounts: AccountColorOption[];
  children: React.ReactNode;
}) {
  return <AccountColorsContext.Provider value={accounts}>{children}</AccountColorsContext.Provider>;
}

// Bills are colored by picking one of your accounts, so its chips on the
// calendar and bill tables match that account's card at a glance.
export function useAccountColors() {
  return useContext(AccountColorsContext);
}
