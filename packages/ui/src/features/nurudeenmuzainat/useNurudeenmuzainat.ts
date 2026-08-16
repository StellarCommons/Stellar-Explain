
import { useNurudeenmuzainatStore } from './NurudeenmuzainatStore';

export const useNurudeenmuzainat = () => {
  const { isActive, toggleActive, data, setData } = useNurudeenmuzainatStore();
  
  const refresh = () => {
    // mock refresh
    setData([{ id: 1, val: 'refreshed' }]);
  };
  
  return { isActive, toggleActive, data, refresh };
};
