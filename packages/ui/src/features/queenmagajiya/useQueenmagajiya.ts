
import { useQueenmagajiyaStore } from './QueenmagajiyaStore';

export const useQueenmagajiya = () => {
  const { isActive, toggleActive, data, setData } = useQueenmagajiyaStore();
  
  const refresh = () => {
    // mock refresh
    setData([{ id: 1, val: 'refreshed' }]);
  };
  
  return { isActive, toggleActive, data, refresh };
};
