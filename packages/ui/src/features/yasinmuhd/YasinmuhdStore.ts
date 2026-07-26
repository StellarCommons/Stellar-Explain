
import { create } from 'zustand';
import { YasinmuhdState } from './YasinmuhdTypes';

interface YasinmuhdStore extends YasinmuhdState {
  toggleActive: () => void;
  setData: (data: any[]) => void;
}

export const useYasinmuhdStore = create<YasinmuhdStore>((set) => ({
  isActive: false,
  data: [],
  toggleActive: () => set((state) => ({ isActive: !state.isActive })),
  setData: (data) => set({ data }),
}));
