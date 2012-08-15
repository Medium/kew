function Promise(onSuccess, onFail) {
  this.promise = this
  this._isPromise = true
  this._successFn = onSuccess
  this._failFn = onFail
}

Promise.prototype.withInput = function (data) {
  if (this._successFn) {
    try {
      this.resolve(this._successFn(data))
    } catch (e) {
      this.reject(e)
    }
  } else this.resolve(data)
}

Promise.prototype.withError = function (e) {
  if (this._failFn) {
    try {
      this.resolve(this._failFn(e))
    } catch (e) {
      this.reject(e)
    }
  } else this.reject(e)
}

Promise.prototype.resolve = function (data) {
  if (data && data._isPromise) {
    this._child = data
    if (this._promises) {
      for (var i = 0; i < this._promises.length; i += 1) {
        data._chainPromise(this._promises[i])
      }
      delete this._promises
    }
    return
  }

  this._hasData = true
  this._data = data

  if (this._promises) {
    for (var i = 0; i < this._promises.length; i += 1) {
      this._promises[i].withInput(data)
    }
    delete this._promises
  }
}

Promise.prototype.reject = function (e) {
  this._error = e

  if (this._promises) {
    for (var i = 0; i < this._promises.length; i += 1) {
      this._promises[i].withError(e)
    }
    delete this._promises
  }

  if (this._ended) throw e
}

Promise.prototype._chainPromise = function (promise) {
  if (this._child) this._child._chainPromise(promise)
  else if (this._hasData) promise.withInput(this._data)
  else if (this._error) promise.withError(this._error)
  else if (!this._promises) this._promises = [promise]
  else this._promises.push(promise)
}

Promise.prototype.then = function (onSuccess, onFail) {
  var promise = new Promise(onSuccess, onFail)

  if (this._child) this._child._chainPromise(promise)
  else this._chainPromise(promise)

  return promise
}

Promise.prototype.fail = function (onFail) {
  return this.then(null, onFail)
}

Promise.prototype.fin = function (onComplete) {
  if (!this._onComplete) this._onComplete = [onComplete]
  else this._onComplete.push(onComplete)
  return this
}

Promise.prototype.end = function () {
  if (this._error) {
    throw this._error
  }
  this._ended = true
}

function resolver(deferred, err, data) {
  if (err) deferred.reject(err)
  else deferred.resolve(data)
}

Promise.prototype.makeNodeResolver = function () {
  return resolver.bind(null, this)
}

function resolve(data) {
  var promise = new Promise()
  promise.resolve(data)
  return promise
}

function reject(e) {
  var promise = new Promise()
  promise.reject(e)
  return promise
}

function setOutput(arr, idx, val) {
  arr[idx] = val
}

function replaceEl(arr, idx, val) {
  arr[idx] = val
  return val
}

function all(promises) {
  if (!promises.length) return resolve([])

  var outputs = []
  var counter = 0
  var finished = false
  var promise = new Promise()
  var counter = promises.length

  for (var i = 0; i < promises.length; i += 1) {
    if (!promises[i] || !promises[i]._isPromise) {
      outputs[i] = promises[i]
      counter -= 1
    } else {
      promises[i].then(replaceEl.bind(null, outputs, i))
      .then(function () {
        counter--
        if (!finished && counter === 0) {
          finished = true
          promise.resolve(outputs)
        }
      }, function (e) {
        if (!finished) {
          finished = true
          promise.reject(e)
        }
      })
    }
  }

  if (counter === 0) {
    finished = true
    promise.resolve(outputs)
  }

  return promise
}

function defer() {
  return new Promise()
}

module.exports = {
    resolve: resolve
  , reject: reject
  , all: all
  , defer: defer
}