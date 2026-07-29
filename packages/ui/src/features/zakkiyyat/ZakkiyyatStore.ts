
import { create } from 'zustand';
import { ZakkiyyatState } from './ZakkiyyatTypes';

interface ZakkiyyatStore extends ZakkiyyatState {
  toggleActive: () => void;
  setData: (data: any[]) => void;
}

export const useZakkiyyatStore = create<ZakkiyyatStore>((set) => ({
  isActive: false,
  data: [],
  toggleActive: () => set((state) => ({ isActive: !state.isActive })),
  setData: (data) => set({ data }),
}));
