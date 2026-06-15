import { create } from 'zustand';

interface UiState {
  openDealId: string | null;
  // FXSW-060: the historic trade-detail overlay. Kept as a separate field so it
  // doesn't interact with the active ticket logic; opening one closes the other.
  openHistoricId: string | null;
  openTicket: (dealId: string) => void;
  closeTicket: () => void;
  openHistoric: (dealId: string) => void;
  closeHistoric: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  openDealId: null,
  openHistoricId: null,
  openTicket: (dealId) => set({ openDealId: dealId, openHistoricId: null }),
  closeTicket: () => set({ openDealId: null }),
  openHistoric: (dealId) => set({ openHistoricId: dealId, openDealId: null }),
  closeHistoric: () => set({ openHistoricId: null }),
}));
