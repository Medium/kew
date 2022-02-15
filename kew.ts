interface KewPromiseType<T> extends Promise<T> {
  fail(err: any): KewPromiseType<T>
  end(): void
  fin(finalCallback: (() => void) | null): KewPromise<T>
}

type FulfilledCb<T, TResult> = ((value: T) => TResult | PromiseLike<TResult>) | undefined | null
type RejectedCb<TResult = never> =
  | ((reason: any) => TResult | PromiseLike<TResult>)
  | undefined
  | null

export class KewPromise<T> implements KewPromiseType<T> {
  constructor(private nativePromise: Promise<T>) {}

  public readonly [Symbol.toStringTag] = this.nativePromise[Symbol.toStringTag]

  public then<TResult1 = T, TResult2 = never>(
    onFulfilled?: FulfilledCb<T, TResult1>,
    onRejected?: RejectedCb<TResult2>
  ): KewPromise<TResult1 | TResult2> {
    return new KewPromise(this.nativePromise.then(onFulfilled, onRejected))
  }

  public catch<TResult = never>(onRejected?: RejectedCb<TResult>): KewPromise<T | TResult> {
    return new KewPromise(this.nativePromise.catch(onRejected))
  }

  public fail<TResult = never>(onRejected?: RejectedCb<TResult>): KewPromise<T | TResult> {
    return new KewPromise(this.nativePromise.catch(onRejected))
  }

  // no-op, kept for backward-compatibility
  public end() {}

  public finally(finalCallback: (() => void) | null): KewPromise<T> {
    const onFinally = (cb: any) => {
      return finalCallback ? Promise.resolve(finalCallback()).then(cb) : cb
    }
    const promise = this.nativePromise.then(
      result => onFinally(() => result),
      reason => onFinally(() => Promise.reject(reason))
    )
    return new KewPromise<T>(promise)
  }

  public fin = this.finally
}

export function resolve<T>(val: T): KewPromise<T> {
  return new KewPromise(Promise.resolve(val))
}

export function reject<T>(val: T): KewPromise<T> {
  return new KewPromise(Promise.reject(val))
}

class KewDeferred<T> {
  public promise: KewPromise<T>
  public resolve!: <K = T>(val: K | PromiseLike<K>) => void
  public reject!: <K = T>(val: K | PromiseLike<K>) => void

  constructor() {
    const promise = new Promise<T>((resolve, reject) => {
      this.resolve = resolve as <K = T>(val: K) => void
      this.reject = reject as <K = T>(val: K | PromiseLike<K>) => void
    })
    this.promise = new KewPromise(promise)
  }

  public makeNodeResolver(): (error: any, data: T | undefined) => void {
    return buildNodeResolver(this)
  }
}

export function defer<T>(): KewDeferred<T> {
  return new KewDeferred<T>()
}

export function all(promises: KewPromise<any>[]) {
  return new KewPromise(Promise.all(promises))
}

export function delay(duration: number): KewPromise<void>
export function delay<T>(returnValue: T, duration: number): KewPromise<T>
export function delay<T>(arg1: number | T, arg2?: number) {
  let duration: number
  let returnValue: undefined | T

  if (typeof arg2 !== 'undefined') {
    duration = arg2
    returnValue = arg1 as T
  } else {
    duration = arg1 as number
  }

  return new KewPromise(
    new Promise(resolve => {
      setTimeout(() => {
        resolve(returnValue)
      }, duration)
    })
  )
}

export function fcall<T>(fn: (...args: any[]) => T, ...args: any[]) {
  const deferred = defer<T>()
  process.nextTick(() => {
    try {
      deferred.resolve(fn.apply(undefined, args))
    } catch (err) {
      deferred.reject(err)
    }
  })
  return deferred.promise
}

export function ncall<T>(fn: (...args: any[]) => T, thisObj: any, ...args: any[]) {
  const deferred = defer<T>()
  try {
    const fnArgs = [...args, buildNodeResolver(deferred)]
    fn.apply(thisObj, fnArgs)
  } catch (err) {
    deferred.reject(err)
  }
  return deferred.promise
}

export function nfcall<T>(fn: (...args: any[]) => T, ...args: any[]) {
  return ncall(fn, undefined, ...args)
}

function buildNodeResolver<T>(deferred: KewDeferred<T>) {
  return (err: any, data: T | undefined) => {
    if (err) {
      deferred.reject(err)
    } else {
      deferred.resolve(data)
    }
  }
}
