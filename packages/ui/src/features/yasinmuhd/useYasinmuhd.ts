
import { useYasinmuhdStore } from './YasinmuhdStore';

export const useYasinmuhd = () => {
  const { isActive, toggleActive, data, setData } = useYasinmuhdStore();
  
  const refresh = () => {
    // mock refresh
    setData([{ id: 1, val: 'refreshed' }]);
  };
  
  return { isActive, toggleActive, data, refresh };
};
