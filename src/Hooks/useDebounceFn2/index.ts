import { useEffect, useCallback, useRef } from 'react';

export const useDebounceFn = (fn: Function, delay: number, dep = []) => {
  const { current } = useRef<{ fn: Function; timer: any }>({ fn, timer: null });
  useEffect(() => {
    current.fn = fn;
  }, [fn]);

  return useCallback(function f(...args) {
    if (current.timer) {
      clearTimeout(current.timer);
    }
    current.timer = setTimeout(() => {
      current.fn.call(this, ...args);
    }, delay);
  }, dep);
};
