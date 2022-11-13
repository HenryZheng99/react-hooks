import { useState } from 'react';
import useThrottleFn from '../useThrottleFn';

// 值在节流后触发变化
function useThrottle<T>(value: T, wait: number): T {
  const [state, setState] = useState<T>(value);

  useThrottleFn(
    () => {
      setState(value);
    },
    wait,
    [value],
  );

  return state;
}

export default useThrottle;
