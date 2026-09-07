'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { DEFAULT_BUSINESS_SETTINGS, type BusinessSettings } from '@/types/settings';

/**
 * The phone number, the WhatsApp number and the rest of what the panel calls
 * "business settings", handed down from the server render.
 *
 * A context rather than props because the components that need it — the footer
 * on every page, the contact block — sit deep inside page trees that have no
 * other reason to know about any of this.
 */
const BusinessContext = createContext<BusinessSettings>(DEFAULT_BUSINESS_SETTINGS);

export function BusinessProvider({
  settings,
  children,
}: {
  settings: BusinessSettings;
  children: ReactNode;
}) {
  return <BusinessContext.Provider value={settings}>{children}</BusinessContext.Provider>;
}

export function useBusiness(): BusinessSettings {
  return useContext(BusinessContext);
}
