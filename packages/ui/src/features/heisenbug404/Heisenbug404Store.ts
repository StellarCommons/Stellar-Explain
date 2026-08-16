
import { create } from 'zustand';
import { Heisenbug404State } from './Heisenbug404Types';

interface Heisenbug404Store extends Heisenbug404State {
  toggleActive: () => void;
  setData: (data: any[]) => void;
}

export const useHeisenbug404Store = create<Heisenbug404Store>((set) => ({
  isActive: false,
  data: [],
  toggleActive: () => set((state) => ({ isActive: !state.isActive })),
  setData: (data) => set({ data }),
}));
