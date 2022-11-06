import { useEffect, useRef } from 'react';
import IsEqual from 'lodash.isequal';

const useDeepMemo = <T>(value: T, isEqual: (prev: T, cur: T) => boolean = IsEqual): T => {
  const cacheValue = useRef<T>(value);
  // 深比较
  const isSame = isEqual(cacheValue.current, value);
  useEffect(() => {
    if (!isSame) {
      // 记录值变化
      cacheValue.current = value;
    }
  });
  return isSame ? cacheValue.current : value;
};

export default useDeepMemo;
