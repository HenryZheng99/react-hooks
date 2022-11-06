import { useState, useEffect } from 'react';

// 感知页面可见性
const usePageVisible = (): [boolean, DocumentVisibilityState] => {
  const [state, setState] = useState(() => ({
    hidden: document.hidden,
    visibilityState: document.visibilityState,
  }));

  const onVisibilityChangeEvent = () => {
    setState({
      hidden: document.hidden,
      visibilityState: document.visibilityState,
    });
  };

  useEffect(() => {
    document.addEventListener('visibilitychange', onVisibilityChangeEvent);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChangeEvent);
    };
  }, []);

  return [state.hidden, state.visibilityState];
};

export default usePageVisible;
