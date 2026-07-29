
import { create } from 'zustand';
import { HasidasbuildsState } from './HasidasbuildsTypes';

interface HasidasbuildsStore extends HasidasbuildsState {
  toggleActive: () => void;
  setData: (data: any[]) => void;
}

export const useHasidasbuildsStore = create<HasidasbuildsStore>((set) => ({
  isActive: false,
  data: [],
  toggleActive: () => set((state) => ({ isActive: !state.isActive })),
  setData: (data) => set({ data }),
}));
