
import { useHasidasbuildsStore } from './HasidasbuildsStore';

export const useHasidasbuilds = () => {
  const { isActive, toggleActive, data, setData } = useHasidasbuildsStore();
  
  const refresh = () => {
    // mock refresh
    setData([{ id: 1, val: 'refreshed' }]);
  };
  
  return { isActive, toggleActive, data, refresh };
};
