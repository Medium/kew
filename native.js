'use strict'

class Q extends Promise {
  constructor(onSuccess, onFail) {
    super(() => {})
    this.then(onSuccess, onFail)

    TODO This and methods below are tough. Maybe have this class not inherit promise but just hold an internal
  }

  resolve(data) {}
  reject(e) {}

  thenBound(onSuccess, scope, var_args) {
    let args = Array.prototype.slice.call(arguments, 1)
    let boundFn = Function.prototype.bind.apply(onSuccess, args)
    return this.then(boundFn)
  }

  fail(onFail) {
    return this.catch(onFail)
  }

  failBound(onFail, scope, var_args) {
    let args = Array.prototype.slice.call(arguments, 1)
    let boundFn = Function.prototype.bind.apply(onFail, args)
    return this.catch(boundFn)
  }

  spread(onSuccess) {
    return this.then((arr) => onSuccess.apply(null, arr))
  }

  spreadBound(onSuccess, scope, var_args) {
    let args = Array.prototype.slice.call(arguments, 2)
    return this.then((arr) => onSuccess.apply(scope, args.concat(arr)))
  }

  fin(onComplete) {
    this.then(onComplete, onComplete)
    return this
  }

  end() {
    this.catch((err) => {
      throw err
    })
    return this
  }

  done(onSuccess, onFail) {
    this.then(onSuccess, onFail).end()
  }

  timeout(timeoutMs, timeoutMsg) {
    let deferred = new Promise()
    let isTimeout = false

    let timeout = setTimeout(() => {
      deferred.reject(new Error(timeoutMsg || `Promise timeout after ${timeoutMs} ms`))
      isTimeout = true
    }, timeoutMs)

    this.then((data) => {
      if (!isTimeout) {
        clearTimeout(timeout)
        deferred.resolve(data)
      }
    }, (err) => {
      if (!isTimeout) {
        clearTimeout(timeout)
        deferred.reject(err)
      }
    })

    return deferred.promise
  }

  makeNodeResolver() {
    return function resolver(err, data) {
      if (err) this.reject(err)
      else this.resolve(data)
    }.bind(this)
  }

  delay(ms) {
    return this.then((val) => delay(val, ms))
  }
}

function all() {}
function bindPromise() {}
function defer() {}
function delay() {}
function fcall() {}
function isPromise() {}
function isPromiseLike() {}
function ncall() {}
function nfcall() {}
function resolve() {}
function reject() {}
function spread() {}
function stats() {}
function allSettled() {}
function getNextTickFunction() {}
function getNextTickFunction() {}
