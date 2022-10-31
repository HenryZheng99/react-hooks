import { useEffect } from 'react';

// 组件加载完成执行
export default (fn: () => void) => {
  useEffect(() => {
    fn();
  }, []);
};
