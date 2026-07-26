
import { create } from 'zustand';
import { QueenmagajiyaState } from './QueenmagajiyaTypes';

interface QueenmagajiyaStore extends QueenmagajiyaState {
  toggleActive: () => void;
  setData: (data: any[]) => void;
}

export const useQueenmagajiyaStore = create<QueenmagajiyaStore>((set) => ({
  isActive: false,
  data: [],
  toggleActive: () => set((state) => ({ isActive: !state.isActive })),
  setData: (data) => set({ data }),
}));
