export enum THREAD_TASK_STATUS {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  RUNNING = 'RUNNING',
  ERROR = 'ERROR',
  TIMEOUT = 'TIMEOUT',
  KILLED = 'KILLED',
}

/**
 * This function accepts as a parameter a function "userFunc"
 * And as a result returns an anonymous function.
 * This anonymous function, accepts as arguments,
 * the parameters to pass to the function "useArgs" and returns a Promise
 * This function can be used as a wrapper, only inside a Worker
 * because it depends by "postMessage".
 *
 * @param {Function} userFunc {Function} fn the function to run with web worker
 *
 * @returns {Function} returns a function that accepts the parameters
 * to be passed to the "userFunc" function
 */
const jobRunner = (userFunc: Function) => (e: MessageEvent) => {
  const userFuncArgs = e.data[0];
  return Promise.resolve(userFunc.apply(null, userFuncArgs))
    .then((result) => {
      // @ts-ignore
      postMessage(['SUCCESS', result]);
    })
    .catch((error) => {
      // @ts-ignore
      postMessage(['ERROR', error]);
    });
};

/**
 *
 * Concatenates the remote dependencies into a comma separated string.
 * this string will then be passed as an argument to the "importScripts" function
 *
 * @param {Array.<String>}} deps array of string
 * @returns {String} a string composed by the concatenation of the array
 * elements "deps" and "importScripts".
 *
 * @example
 * remoteDepsParser(['http://js.com/1.js', 'http://js.com/2.js']) // return importScripts('http://js.com/1.js, http://js.com/2.js')
 */
const remoteDepsParser = (deps: string[]) => {
  if (deps.length === 0) return '';

  const depsString = deps.map((dep) => `${dep}`).toString();
  return `importScripts('${depsString}')`;
};

/**
 * Converts the "fn" function into the syntax needed to be executed within a web worker
 *
 * @param {Function} fn the function to run with web worker
 * @param {Array.<String>} deps array of strings, imported into the worker through "importScripts"
 *
 * @returns {String} a blob url, containing the code of "fn" as a string
 *
 * @example
 * createWorkerBlobUrl((a,b) => a+b, [])
 * // return "onmessage=return Promise.resolve((a,b) => a + b)
 * .then(postMessage(['SUCCESS', result]))
 * .catch(postMessage(['ERROR', error])"
 */
const createWorkerBlobUrl = (fn: Function, deps: string[] = []) => {
  const blobCode = `${remoteDepsParser(deps)}; onmessage=(${jobRunner})(${fn})`;
  const blob = new Blob([blobCode], { type: 'text/javascript' });
  const url = URL.createObjectURL(blob);
  return url;
};

export { createWorkerBlobUrl };
