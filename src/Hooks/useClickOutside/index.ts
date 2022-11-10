import { MutableRefObject, useRef, useEffect, useCallback } from 'react';

/**
 * 管理目标元素外点击事件
 */

// 鼠标点击事件，click 不会监听右键
const defaultEvent = 'click';

type RefType = HTMLElement | (() => HTMLElement | null) | null | undefined;

export default function useClickOutside<T extends HTMLElement = any>(
  dom: RefType = undefined, // 如果未传入则会监听返回结果中的 ref，否则会监听传入的节点
  onClickAway: (event: KeyboardEvent) => void, // 触发回调
  eventName: string = defaultEvent,
  lisenterOptions?: boolean | AddEventListenerOptions | undefined,
): MutableRefObject<T> {
  const element = useRef<T>();

  const handler = useCallback(
    (event) => {
      const targetElement = typeof dom === 'function' ? dom() : dom;
      const el = targetElement || element.current;
      // https://developer.mozilla.org/en-US/docs/Web/API/Event/composedPath
      // 1. 包裹元素包含点击元素
      // 2. 点击元素曾在包裹元素内
      // composedPath 获取事件冒泡路径
      if (
        !el ||
        el.contains(event.target) ||
        (event.composedPath && event.composedPath().includes(el))
      ) {
        return;
      }

      onClickAway(event);
    },
    [element.current, onClickAway, dom],
  );

  useEffect(() => {
    document.addEventListener(eventName, handler, lisenterOptions);

    return () => {
      document.removeEventListener(eventName, handler, lisenterOptions);
    };
  }, [eventName, lisenterOptions, handler]);

  return element as MutableRefObject<T>;
}
