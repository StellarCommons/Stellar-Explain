
import { create } from 'zustand';
import { InteeeState } from './InteeeTypes';

interface InteeeStore extends InteeeState {
  toggleActive: () => void;
  setData: (data: any[]) => void;
}

export const useInteeeStore = create<InteeeStore>((set) => ({
  isActive: false,
  data: [],
  toggleActive: () => set((state) => ({ isActive: !state.isActive })),
  setData: (data) => set({ data }),
}));
