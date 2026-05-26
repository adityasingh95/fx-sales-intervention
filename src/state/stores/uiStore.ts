import { create } from 'zustand';

interface UiState {
  openDealId: string | null;
  openTicket: (dealId: string) => void;
  closeTicket: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  openDealId: null,
  openTicket: (dealId) => set({ openDealId: dealId }),
  closeTicket: () => set({ openDealId: null }),
}));
