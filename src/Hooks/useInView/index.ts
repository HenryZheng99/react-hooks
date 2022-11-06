import React, { useState, useEffect, useCallback, useRef } from 'react';
import 'intersection-observer';

// 用于感知元素是否处于可视范围的 hook，可用于懒加载、埋点等场景。
const useInView = <T extends HTMLElement = any>(
  el?: T | (() => T), // 监听的DOM元素
  options?: IntersectionObserverInit, // IntersectionObserver监听配置
  deps: any[] = [], // 依赖数组
  cb?: () => void, // 处于可视范围内触发回调
): [React.MutableRefObject<T>, boolean] => {
  const ref = useRef<T>();
  const [inView, setInView] = useState(false);

  // 合并cb作为IntersectionObserver的callback
  const callback = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      setInView(entries[0].isIntersecting);
      if (entries[0].isIntersecting && cb !== undefined && typeof cb === 'function') {
        cb();
      }
    },
    [cb],
  );

  // 考虑这里用useLayoutEffect的情况？
  useEffect(() => {
    let target = ref.current;
    if (el) {
      target = typeof el === 'function' ? el() : el;
    }
    const ios = new IntersectionObserver(callback, options);
    // 需要加setTimeout吗？
    if (target) {
      ios.observe(target);
    }
    return () => ios.disconnect();
  }, [ref.current, el, ...deps, cb]);

  // 返回dom Ref，inView是否可视
  return [ref as React.MutableRefObject<T>, inView];
};

export default useInView;
