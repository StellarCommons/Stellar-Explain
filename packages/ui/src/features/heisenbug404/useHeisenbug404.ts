
import { useHeisenbug404Store } from './Heisenbug404Store';

export const useHeisenbug404 = () => {
  const { isActive, toggleActive, data, setData } = useHeisenbug404Store();
  
  const refresh = () => {
    // mock refresh
    setData([{ id: 1, val: 'refreshed' }]);
  };
  
  return { isActive, toggleActive, data, refresh };
};
