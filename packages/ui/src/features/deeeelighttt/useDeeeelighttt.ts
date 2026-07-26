
import { useDeeeelightttStore } from './DeeeelightttStore';

export const useDeeeelighttt = () => {
  const { isActive, toggleActive, data, setData } = useDeeeelightttStore();
  
  const refresh = () => {
    // mock refresh
    setData([{ id: 1, val: 'refreshed' }]);
  };
  
  return { isActive, toggleActive, data, refresh };
};
