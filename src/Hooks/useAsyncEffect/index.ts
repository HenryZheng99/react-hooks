import { useEffect, DependencyList } from 'react';

export type Cleanup = void | (() => void);

export type AsyncEffectCallback = () => Promise<Cleanup>;

// 支持在useEffect中使用异步函数
const useAsyncEffect = (asyncCallback: AsyncEffectCallback, deps?: DependencyList) => {
  useEffect(() => {
    const promiseResult = asyncCallback();
    return () => {
      // 执行asyncCallback的销毁函数
      promiseResult.then((cleanup) => {
        if (typeof cleanup === 'function') {
          cleanup();
        }
      });
    };
  }, deps);
};

export default useAsyncEffect;
