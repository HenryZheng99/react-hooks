import { useEffect, useState, useRef, RefObject } from 'react';

// 管理移动端拖拽偏移量
type DragPropsType = {
  targetDomRef: RefObject<HTMLElement>;
  onTouchStart?: Function;
  onTouchMove?: Function;
  onTouchEnd?: Function;
};

// 窗口总宽度
const docWidth = document.documentElement.clientWidth;

export default function useMobileDrag(props: DragPropsType) {
  // 触碰点到元素最左边的距离
  const touchStartX = useRef(0);
  const [x, setX] = useState(0);
  const [touchLeft, setTouchLeft] = useState(0);

  const {
    targetDomRef,
    onTouchStart = () => {},
    onTouchMove = () => {},
    onTouchEnd = () => {},
  } = props;

  useEffect(() => {
    if (!targetDomRef?.current) {
      return;
    }

    const target = targetDomRef.current;
    // 当前被拖拽元素宽度
    const { width } = target.getBoundingClientRect();

    const touchmove = (e: TouchEvent) => {
      // 点击的位置距离窗口左边的距离
      const { clientX } = e.targetTouches[0];

      let calcX = 0;

      if (clientX - touchStartX.current >= 0) {
        // 右滑到底的边界值，是0
        calcX = 0;
      } else if (clientX - touchStartX.current <= docWidth - width) {
        // 左滑到底的边界值，是窗口总宽度-元素宽度
        calcX = docWidth - width;
      } else {
        calcX = Math.round(clientX - touchStartX.current);
      }

      setX(calcX);

      onTouchMove(calcX);
    };
    const touchend = () => {
      // 当前被拖拽元素宽度
      const { left: _left } = target.getBoundingClientRect();
      setTouchLeft(_left);
      onTouchEnd();
      window.removeEventListener('touchmove', touchmove);
      window.removeEventListener('touchend', touchend);
    };
    const touchstart = (e: TouchEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const { left: _left } = target?.getBoundingClientRect();
      const { clientX } = e.targetTouches[0];
      touchStartX.current = clientX - _left;

      window.addEventListener('touchmove', touchmove);
      window.addEventListener('touchend', touchend);

      onTouchStart();
    };
    target.addEventListener('touchstart', touchstart);
    return () => {
      target.removeEventListener('touchstart', touchstart);
    };
  }, [targetDomRef]);

  return { x, touchLeft };
}
