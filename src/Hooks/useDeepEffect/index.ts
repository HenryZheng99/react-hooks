import { useEffect } from 'react';
import useDeepMemo from '../useDeepMemo';

// callback需要执行的副作用
// deps 依赖数组
// isEqual 深比较函数，默认为lodash.isEqual
export function useDeepEffect<T>(callback: React.EffectCallback, deps: T[]): void;
export function useDeepEffect<T>(
  callback: React.EffectCallback,
  isEqual: (cur: T[], prev: T[]) => boolean,
  deps: T[],
): void;

export function useDeepEffect<T>() {
  const callback = arguments[0];
  let isEqual = arguments[1];
  let deps = arguments[2];
  // 只传入2个参数的情况
  if (arguments.length === 2) {
    deps = isEqual as unknown as T[];
    isEqual = undefined as unknown as (cur: T[], prev: T[]) => boolean;
  }
  // 深比较deps
  const memoizedDeps = useDeepMemo<T[]>(deps, isEqual);
  useEffect(() => {
    return callback();
  }, [memoizedDeps]);
}
export default useDeepEffect;
