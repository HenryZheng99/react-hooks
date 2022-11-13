import { useState } from 'react';
import useDebounceFn from '../useDebounceFn';

// 处理DebouncedValue，value会在防抖后触发更新
function useDebounce<T>(value: T, wait: number): T {
  const [state, setState] = useState<T>(value);

  useDebounceFn(
    () => {
      setState(value);
    },
    wait,
    [value],
  );

  return state;
}

export default useDebounce;
