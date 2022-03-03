interface KewPromiseType<T> extends Promise<T> {
  fail(err: any): KewPromiseType<T>
  end(): void
  fin(finalCallback: (() => void) | null): KewPromise<T>
  timeout(timeoutMs: number, timeoutMsg?: string): KewPromise<T>
  thenBound(onFulfilled: (...args: any[]) => any, thisObj: any, ...args: any[]): KewPromise<T>
  failBound(onRejected: (...args: any[]) => any, thisObj: any, ...args: any[]): KewPromise<T>
}

type FulfilledCb<T, TResult> = (value: T) => TResult | PromiseLike<TResult>
type RejectedCb<TResult = never> = (reason: any) => TResult | PromiseLike<TResult>

let nextTickFunction: Function = process.nextTick

export function getNextTickFunction() {
  return nextTickFunction
}

export function setNextTickFunction(fn: Function) {
  nextTickFunction = fn
}

export class KewPromise<T> implements KewPromiseType<T> {
  constructor(private nativePromise: Promise<T>) {}

  public readonly [Symbol.toStringTag] = this.nativePromise[Symbol.toStringTag]

  public get promise(): KewPromise<T> {
    return this
  }

  private static identity(x: any) {
    return x
  }

  private static throwErr(err: any): never {
    throw err
  }

  public then<TResult1 = T, TResult2 = never>(
    onFulfilled: FulfilledCb<T, TResult1> = KewPromise.identity,
    onRejected: RejectedCb<TResult2> = KewPromise.throwErr
  ): KewPromise<TResult1 | TResult2> {
    const prom = defer<TResult1 | TResult2>()
    const nextTickOnFulfilled = (data: T) => {
      nextTickFunction(() => {
        let res: any
        try {
          res = onFulfilled(data)
        } catch (err) {
          prom.reject(err)
        }
        prom.resolve(res)
      })
    }

    const nextTickOnRejected = (err: TResult2) => {
      nextTickFunction(() => {
        let res: any
        try {
          res = onRejected(err)
        } catch (e) {
          prom.reject(e)
        }
        prom.resolve(res)
      })
    }

    this.nativePromise.then(nextTickOnFulfilled, nextTickOnRejected)
    return prom.promise
  }

  public catch<TResult = never>(onRejected?: RejectedCb<TResult>): KewPromise<T | TResult> {
    return this.then(undefined, onRejected)
  }

  public fail<TResult = never>(onRejected?: RejectedCb<TResult>): KewPromise<T | TResult> {
    return this.catch(onRejected)
  }

  public thenBound<TResult>(
    onFulfilled: (...args: any[]) => TResult,
    thisObj: any,
    ...args: any[]
  ): KewPromise<TResult> {
    return this.then(data => onFulfilled.apply(thisObj, [...args, data]))
  }

  public failBound(
    onRejected: (...args: any[]) => any,
    thisObj: any,
    ...args: any[]
  ): KewPromise<any> {
    return this.catch(err => onRejected.apply(thisObj, [...args, err]))
  }

  // no-op, kept for backward-compatibility
  public end() {
    return this
  }

  // no-op, kept for backward-compatibility
  public done() {
    return this
  }

  public finally(finalCallback: (() => void) | null): KewPromise<T> {
    const onFinally = (cb: any) => {
      return finalCallback ? Promise.resolve(finalCallback()).then(cb) : cb()
    }
    return this.then(
      result => onFinally(() => result),
      reason => onFinally(() => Promise.reject(reason))
    )
  }

  public fin = this.finally

  public timeout(timeoutMs: number, timeoutMsg?: string) {
    const deferred = defer<T>()
    let hasTimeout = false

    const timeoutId = setTimeout(() => {
      hasTimeout = true
      deferred.reject(new Error(timeoutMsg ?? `Promise timeout after ${timeoutMs} ms.`))
    }, timeoutMs)

    this.nativePromise.then(
      data => {
        if (!hasTimeout) {
          clearTimeout(timeoutId)
          deferred.resolve(data)
        }
      },
      err => {
        if (!hasTimeout) {
          clearTimeout(timeoutId)
          deferred.reject(err)
        }
      }
    )

    return deferred.promise
  }
}

export function resolve<T>(val: T): KewPromise<T> {
  return new KewPromise(Promise.resolve(val))
}

export function reject<T>(val: T): KewPromise<T> {
  return new KewPromise(Promise.reject(val))
}

class KewDeferred<T> implements KewPromiseType<T> {
  public promise: KewPromise<T>
  public resolve!: <K = T>(val: K | PromiseLike<K>) => void
  public reject!: <K = T>(val: K | PromiseLike<K>) => void

  // Proxy all other methods to the underlying promise to implement its interface
  public then: typeof this.promise.then
  public catch: typeof this.promise.catch
  public fail: typeof this.promise.fail
  public thenBound: typeof this.promise.thenBound
  public failBound: typeof this.promise.failBound
  public timeout: typeof this.promise.timeout
  public done: typeof this.promise.done
  public end: typeof this.promise.end
  public finally: typeof this.promise.finally
  public fin: typeof this.promise.fin
  public readonly [Symbol.toStringTag]: string

  constructor() {
    this.promise = new KewPromise(
      new Promise<T>((resolve, reject) => {
        this.resolve = resolve as <K = T>(val: K) => void
        this.reject = reject as <K = T>(val: K | PromiseLike<K>) => void
      })
    )

    this.then = this.promise.then.bind(this.promise)
    this.catch = this.promise.catch.bind(this.promise)
    this.fail = this.promise.fail.bind(this.promise)
    this.thenBound = this.promise.thenBound.bind(this.promise)
    this.failBound = this.promise.failBound.bind(this.promise)
    this.timeout = this.promise.timeout.bind(this.promise)
    this.done = this.promise.done.bind(this.promise)
    this.end = this.promise.end.bind(this.promise)
    this.finally = this.promise.finally.bind(this.promise)
    this.fin = this.promise.fin.bind(this.promise)
    this[Symbol.toStringTag] = this.promise[Symbol.toStringTag]
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

export function allSettled(promises: KewPromise<any>[]) {
  const promise = Promise.allSettled(promises).then(promises => {
    return promises.map(p => {
      if (p.status === 'fulfilled') {
        return {state: 'fulfilled', value: p.value}
      } else {
        return {state: 'rejected', reason: p.reason}
      }
    })
  })
  return new KewPromise(promise)
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
  nextTickFunction(() => {
    try {
      deferred.resolve(fn.apply(undefined, args))
    } catch (err) {
      deferred.reject(err)
    }
  })
  return deferred.promise
}

export function bindPromise<T>(fn: (...args: any[]) => T, thisObj: any, ...rootArgs: any[]) {
  return function onBoundPromise(...args: any[]) {
    const deferred = defer<T>()
    try {
      const fnArgs = [...rootArgs, ...args, buildNodeResolver(deferred)]
      fn.apply(thisObj, fnArgs)
    } catch (err) {
      deferred.reject(err)
    }
    return deferred.promise
  }
}

export function ncall<T>(fn: (...args: any[]) => T, thisObj: any, ...args: any[]) {
  return bindPromise(fn, thisObj, ...args)()
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

export function isPromise(prom: any) {
  return prom instanceof KewPromise
}

export function isPromiseLike(obj: any) {
  return (typeof obj === 'object' || typeof obj === 'function') && typeof obj.then === 'function'
}

// kept for retro-compatibility, this lib should not be responsible of this
export function stats() {
  return {
    errorsEmitted: 0,
    errorsHandled: 0,
  }
}
