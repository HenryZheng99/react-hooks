import { useRef, useCallback, useEffect } from 'react';
import useForceUpdate from '../useForceUpdate';
import { THREAD_TASK_STATUS, createWorkerBlobUrl } from './utils';

// 创建一个线程池，池中的 worker 可重复使用，当 worker 不足时任务进入队列

type Options = {
  size?: number;
  timeout?: number;
  remoteDependencies?: string[];
};

type ResolveFn = (value: any) => void;

type RejectFn = (reason: any) => void;

type Task = {
  status: THREAD_TASK_STATUS;
  timeoutId?: number;
  result?: any; // result为worker执行返回的结果
  worker?: Worker;
  reject: ResolveFn;
};

const useThreadPool = <T extends (...fnArgs: any[]) => any>(fn: T, options: Options) => {
  // 强制渲染
  const forceUpdate = useForceUpdate();
  const workerUrlRef = useRef('');
  // 线程池用Set
  const workerPoolRef = useRef(new Set<Worker>());
  // 空闲的Worker
  const freeWorkersRef = useRef<Worker[]>([]);
  // 任务池
  const allTasksRef = useRef(new Map<number, Task>());
  // 任务等待队列
  const pendingQueueRef = useRef<[ResolveFn, RejectFn, any[], number][]>([]);

  const poolSize = options.size || navigator.hardwareConcurrency / 2;

  // 设置worker任务状态
  const setTaskStatus = useCallback((id: number, status: THREAD_TASK_STATUS, result?: any) => {
    const task = allTasksRef.current.get(id);
    if (task) {
      task.status = status;
      task.result = result;
    }
    forceUpdate();
  }, []);

  // worker任务执行结束，释放当前worker，进行新任务
  const onTaskFinish = useCallback((worker: Worker) => {
    worker.onmessage = null as any;
    worker.onerror = null as any;
    freeWorkersRef.current.push(worker);
    if (pendingQueueRef.current.length) {
      startWorker(...pendingQueueRef.current.shift()!);
    }
  }, []);

  // 启动worker执行任务，若无空闲worker则进入等待队列
  const startWorker = useCallback(
    (resolve: ResolveFn, reject: RejectFn, fnArgs: any[], id: number) => {
      const task: Task = {
        status: THREAD_TASK_STATUS.PENDING,
        reject,
      };
      allTasksRef.current.set(id, task);
      if (freeWorkersRef.current.length) {
        const worker = freeWorkersRef.current.pop() as Worker;
        worker.onmessage = (e) => {
          const [status, result] = e.data as [THREAD_TASK_STATUS, ReturnType<T>];
          switch (status) {
            case THREAD_TASK_STATUS.SUCCESS:
              resolve(result);
              setTaskStatus(id, THREAD_TASK_STATUS.SUCCESS, result);
              break;
            default:
              reject(result);
              setTaskStatus(id, THREAD_TASK_STATUS.ERROR, result);
              break;
          }
          onTaskFinish(worker);
        };
        worker.onerror = (e) => {
          reject(e.error);
          setTaskStatus(id, THREAD_TASK_STATUS.ERROR);
          onTaskFinish(worker);
        };
        worker.postMessage([[...fnArgs]]);
        setTaskStatus(id, THREAD_TASK_STATUS.RUNNING);
        task.worker = worker;
      } else {
        pendingQueueRef.current.push([resolve, reject, fnArgs, id]);
      }
      if (options.timeout) {
        const timeoutId = window.setTimeout(() => {
          killTask(id, THREAD_TASK_STATUS.TIMEOUT);
          reject(new TypeError('task timeout'));
        }, options.timeout);
        task.timeoutId = timeoutId;
      }
    },
    [],
  );

  // 初始化worker池
  const initWorkerPool = useCallback(() => {
    if (poolSize < 1) {
      throw new RangeError('size must greater than 0');
    }
    workerUrlRef.current = createWorkerBlobUrl(fn, options.remoteDependencies);
    freeWorkersRef.current = Array.from(
      { length: poolSize },
      () => new Worker(workerUrlRef.current),
    );
    workerPoolRef.current = new Set(freeWorkersRef.current);
  }, []);

  // 调用worker执行任务
  const runFn = useCallback((...fnArgs: Parameters<T>) => {
    if (workerPoolRef.current.size === 0) {
      initWorkerPool();
    }
    const id = Date.now();
    const promise = new Promise<ReturnType<T>>((resolve, reject) =>
      startWorker(resolve, reject, fnArgs, id),
    );
    return [promise, id] as [Promise<ReturnType<T>>, number];
  }, []);

  // 停止worker任务
  const killTask = useCallback((id: number, status?: THREAD_TASK_STATUS) => {
    const task = allTasksRef.current.get(id);
    if (task) {
      if (task.status === THREAD_TASK_STATUS.RUNNING) {
        onTaskFinish(task.worker!);
      } else if (task.status === THREAD_TASK_STATUS.PENDING) {
        const index = pendingQueueRef.current.findIndex((pending) => pending[3] === id);
        pendingQueueRef.current.splice(index, 1);
      }
      if (!status) {
        task.reject(new TypeError('task killed'));
      }
      setTaskStatus(id, status || THREAD_TASK_STATUS.KILLED);
      window.clearTimeout(task.timeoutId);
    }
  }, []);

  // 获取任务状态
  const getTaskStatus = useCallback((id: number) => {
    const task = allTasksRef.current.get(id);
    if (task) {
      return task.status;
    }
  }, []);

  // 获取空闲worker数
  const getFreeCount = useCallback(() => {
    return freeWorkersRef.current.length;
  }, []);

  // 获取等待任务数
  const getPendingCount = useCallback(() => {
    return pendingQueueRef.current.length;
  }, []);

  // 获取执行任务数
  const getRuningCount = useCallback(() => {
    return poolSize - getFreeCount();
  }, []);

  // 清空所有任务和worker
  const clearAll = useCallback(() => {
    freeWorkersRef.current.forEach((w) => {
      workerPoolRef.current.delete(w);
      w.terminate();
    });
    freeWorkersRef.current.length = 0;

    pendingQueueRef.current.forEach(([, reject]) => reject(new TypeError('workerpool cleared')));
    pendingQueueRef.current.length = 0;

    workerPoolRef.current.forEach((w) => {
      w.terminate();
      if (w.onerror) {
        w.onerror(new ErrorEvent('error', { error: new TypeError('workerpool cleared') }));
      }
    });
    workerPoolRef.current.clear();

    URL.revokeObjectURL(workerUrlRef.current);
  }, []);

  useEffect(() => {
    return clearAll;
  }, []);

  const helper = {
    kill: killTask,
    getStatus: getTaskStatus,
    getFreeCount,
    getPendingCount,
    getRuningCount,
  };

  return [runFn, helper] as [typeof runFn, typeof helper];
};

export default useThreadPool;
