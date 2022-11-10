import { useEffect, useRef, useLayoutEffect } from 'react';

type Target = Window | HTMLElement | undefined | null;

// 第三个参数，可选配置的类型
export interface Options {
  target?: Target | (() => Target);
  capture?: boolean;
  once?: boolean;
  passive?: boolean;
}

// 核心逻辑，增删监听事件
function useAddEventListener(
  target: Target | (() => Target),
  type: string, // 事件名称
  listener: Function,
  options?: Options,
): void {
  const listenerRef = useRef(listener);

  useEffect(() => {
    listenerRef.current = listener;
  }, [listener]);

  // 这里用useEffect也是一样的？
  useLayoutEffect(() => {
    const targetEl = typeof target === 'function' ? target() : target;
    if (!targetEl) return;
    const eventListener = (e: Event) => listenerRef.current(e);
    targetEl.addEventListener(type, eventListener, {
      capture: options?.capture,
      once: options?.once,
      passive: options?.passive,
    });
    return () => {
      targetEl.removeEventListener(type, eventListener, {
        capture: options?.capture,
      });
    };
  }, [target, type, options]);
}

export default function useEventListener<T extends HTMLElement = any>(
  eventName: string, // 监听事件
  eventListener: Function, // 回调函数
  options?: Options, // 可选配置
) {
  // ref 在使用的时候确定目标元素，如果没有，默认是window
  // 也可以通过options.target 指定目标元素
  const ref = useRef<T>();
  const eventTarget = options?.target || (() => ref.current || window);
  useAddEventListener(eventTarget, eventName, eventListener, options);
  return ref as React.MutableRefObject<T>;
}
