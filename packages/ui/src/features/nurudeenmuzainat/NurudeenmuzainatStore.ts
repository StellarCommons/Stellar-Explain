
import { create } from 'zustand';
import { NurudeenmuzainatState } from './NurudeenmuzainatTypes';

interface NurudeenmuzainatStore extends NurudeenmuzainatState {
  toggleActive: () => void;
  setData: (data: any[]) => void;
}

export const useNurudeenmuzainatStore = create<NurudeenmuzainatStore>((set) => ({
  isActive: false,
  data: [],
  toggleActive: () => set((state) => ({ isActive: !state.isActive })),
  setData: (data) => set({ data }),
}));
