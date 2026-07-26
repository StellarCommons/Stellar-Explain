
import { create } from 'zustand';
import { DeeeelightttState } from './DeeeelightttTypes';

interface DeeeelightttStore extends DeeeelightttState {
  toggleActive: () => void;
  setData: (data: any[]) => void;
}

export const useDeeeelightttStore = create<DeeeelightttStore>((set) => ({
  isActive: false,
  data: [],
  toggleActive: () => set((state) => ({ isActive: !state.isActive })),
  setData: (data) => set({ data }),
}));
