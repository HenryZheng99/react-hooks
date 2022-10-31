import { useCallback, useEffect, useRef } from 'react';

// 获取当前组件是否已装载
const useIsMounted = () => {
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);
  return useCallback(() => isMounted.current, []);
};

export default useIsMounted;
