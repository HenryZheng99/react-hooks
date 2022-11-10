import { useState, useRef, useCallback, useEffect } from 'react';
import { THREAD_TASK_STATUS, createWorkerBlobUrl } from './utils';

// 参考 https://github.com/alewin/useWorker
// 基于 WebWorker 实现多线程和线程池的 hook，轻松创建非阻塞后台异步任务。
/**
    真正的并行，不阻塞主线程
    线程池模式，复用 worker
    Promise 风格调用任务
    支持手动和自动停止任务和回收资源
    支持配置超时机制和远程依赖文件
 */

type Options = {
  timeout?: number; // 执行超时时间，单位 ms
  remoteDependencies?: string[]; // 远程依赖文件地址
};

const PROMISE_RESOLVE = 'resolve';
const PROMISE_REJECT = 'reject';

const useThread = <T extends (...fnArgs: any[]) => any>(
  fn: T, // 线程池要执行的函数，不可带有任何闭包变量，且不能使用 DOM API
  options: Options = {},
) => {
  // 线程状态，默认为pending
  const [workerStatus, _setWorkerStatus] = useState<THREAD_TASK_STATUS>(THREAD_TASK_STATUS.PENDING);
  // worker实例
  const worker = useRef<Worker & { _url?: string }>();
  // 线程是否正在执行？
  const isRunning = useRef(false);
  // Promise
  const promiseRef = useRef<{
    [PROMISE_REJECT]?: (result: ReturnType<T> | ErrorEvent) => void;
    [PROMISE_RESOLVE]?: (result: ReturnType<T>) => void;
  }>({});
  // timer，标记执行超时
  const timeoutId = useRef<number>();

  // 设置状态
  const setWorkerStatus = useCallback((status: THREAD_TASK_STATUS) => {
    isRunning.current = status === THREAD_TASK_STATUS.RUNNING;
    _setWorkerStatus(status);
  }, []);

  // 销毁worker
  const killWorker = useCallback(() => {
    if (worker.current?._url) {
      worker.current.terminate();
      URL.revokeObjectURL(worker.current._url);
      promiseRef.current = {};
      worker.current = undefined;
      window.clearTimeout(timeoutId.current);
      setWorkerStatus(THREAD_TASK_STATUS.KILLED);
    }
  }, []);

  // 线程执行结束触发
  const onWorkerEnd = useCallback(
    (status: THREAD_TASK_STATUS) => {
      killWorker();
      setWorkerStatus(status);
    },
    [killWorker, setWorkerStatus],
  );

  // 生成worker
  const generateWorker = useCallback(() => {
    const { remoteDependencies, timeout } = options;

    // 需要传入blob Url
    const blobUrl = createWorkerBlobUrl(fn, remoteDependencies!);
    const newWorker: Worker & { _url?: string } = new Worker(blobUrl);
    newWorker._url = blobUrl;

    // onmessage, worker callback
    newWorker.onmessage = (e: MessageEvent) => {
      const [status, result] = e.data as [THREAD_TASK_STATUS, ReturnType<T>];

      switch (status) {
        case THREAD_TASK_STATUS.SUCCESS:
          promiseRef.current[PROMISE_RESOLVE]?.(result);
          onWorkerEnd(THREAD_TASK_STATUS.SUCCESS);
          break;
        default:
          promiseRef.current[PROMISE_REJECT]?.(result);
          onWorkerEnd(THREAD_TASK_STATUS.ERROR);
          break;
      }
    };

    // 异常捕获
    newWorker.onerror = (e: ErrorEvent) => {
      promiseRef.current[PROMISE_REJECT]?.(e);
      onWorkerEnd(THREAD_TASK_STATUS.ERROR);
    };

    // 执行超时
    if (timeout) {
      timeoutId.current = window.setTimeout(() => {
        killWorker();
        setWorkerStatus(THREAD_TASK_STATUS.TIMEOUT);
      }, timeout);
    }
    return newWorker;
  }, [fn, options, killWorker]);

  // 主动触发执行, Promise风格
  const runFn = useCallback(
    (...fnArgs: Parameters<T>) => {
      if (isRunning.current) {
        console.error(
          '[useThread] You can only run one instance of the worker at a time, if you want to run more than one in parallel, create another instance with the hook useThread(). Read more: https://github.com/alewin/useWorker',
        );
        return Promise.reject();
      }
      if (!worker.current) {
        worker.current = generateWorker();
      }

      const promise = new Promise<ReturnType<T>>((resolve, reject) => {
        promiseRef.current = {
          [PROMISE_RESOLVE]: resolve,
          [PROMISE_REJECT]: reject,
        };

        worker.current?.postMessage([[...fnArgs]]);

        setWorkerStatus(THREAD_TASK_STATUS.RUNNING);
      });

      return promise;
    },
    [generateWorker, setWorkerStatus],
  );

  useEffect(() => {
    return killWorker;
  }, []);

  /**
   * runFn 触发执行线程任务，返回 promise 和任务 id
   * status 线程任务执行状态
   * kill 主动结束任务，销毁 Worker
   */
  return [runFn, workerStatus, killWorker] as [
    typeof runFn,
    typeof workerStatus,
    typeof killWorker,
  ];
};

export default useThread;
