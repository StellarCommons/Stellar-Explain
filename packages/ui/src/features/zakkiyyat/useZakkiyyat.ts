
import { useZakkiyyatStore } from './ZakkiyyatStore';

export const useZakkiyyat = () => {
  const { isActive, toggleActive, data, setData } = useZakkiyyatStore();
  
  const refresh = () => {
    // mock refresh
    setData([{ id: 1, val: 'refreshed' }]);
  };
  
  return { isActive, toggleActive, data, refresh };
};
