import { useEffect, useRef } from 'react';

// 使用上与useEffect相同，忽略了首次渲染，在依赖更新时运行
const useUpdateEffect: typeof useEffect = (effect, deps) => {
  const isMounted = useRef(false);
  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
    } else {
      return effect();
    }
    return () => {};
  }, deps);
};

export default useUpdateEffect;
