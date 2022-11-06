import { useReducer } from 'react';

// 用于强制更新组件的 hook，通常在 useRef 管理可变状态，但又需要重渲染时使用。
function useForceUpdate() {
  const [, dispatch] = useReducer(() => Object.create(null), {});
  return dispatch;
}

export default useForceUpdate;
