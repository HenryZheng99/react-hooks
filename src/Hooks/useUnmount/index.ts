import { useEffect, useRef } from 'react';

// 组件卸载前执行回调
export default (fn: () => void) => {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    return () => {
      fnRef.current();
    };
  }, []);
};
