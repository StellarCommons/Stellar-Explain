
import { useInteeeStore } from './InteeeStore';

export const useInteee = () => {
  const { isActive, toggleActive, data, setData } = useInteeeStore();
  
  const refresh = () => {
    // mock refresh
    setData([{ id: 1, val: 'refreshed' }]);
  };
  
  return { isActive, toggleActive, data, refresh };
};
