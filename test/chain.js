var Q = require('../kew')

// test that fin() works with a synchronous resolve
exports.testSynchronousThenAndFin = function (test) {
  var vals = ['a', 'b']
  var counter = 0

  var promise1 = Q.resolve(vals[0])
  var promise2 = promise1.fin(function () {
    counter++
  })
  var promise3 = promise2.then(function (data) {
    if (data === vals[0]) return vals[1]
  })
  var promise4 = promise3.fin(function () {
    counter++
  })

  Q.all([promise2, promise4])
    .then(function (data) {
      test.equal(counter, 2, "fin() should have been called twice")
      test.equal(data[0], vals[0], "first fin() should return the first val")
      test.equal(data[1], vals[1], "second fin() should return the second val")
      test.done()
    })
}

// test that fin() works with a synchronous reject
exports.testSynchronousFailAndFin = function (test) {
  var errs = []
  errs.push(new Error('nope 1'))
  errs.push(new Error('nope 2'))
  var counter = 0

  var promise1 = Q.reject(errs[0])
  var promise2 = promise1.fin(function () {
    counter++
  })
  var promise3 = promise2.fail(function (e) {
    if (e === errs[0]) return Q.reject(errs[1])
  })
  var promise4 = promise3.fin(function () {
    counter++
  })

  Q.all([
    promise2.fail(function (e) {
      test.equal(e, errs[0])
    }),
    promise4.fail(function (e) {
      test.equal(e, errs[1])
    })
  ])
    .fail(function (data) {
      test.equal(counter, 2, "fin() should have been called twice")
      test.done()
    })
}

// test that fin() works with an asynchrnous resolve
exports.testAsynchronousThenAndFin = function (test) {
  var vals = ['a', 'b']
  var counter = 0

  var defer = Q.defer()
  setTimeout(function () {
    defer.resolve(vals[0])
  })
  var promise1 = defer.promise
  var promise2 = promise1.fin(function () {
    counter++
  })
  var promise3 = promise2.then(function (data) {
    if (data !== vals[0]) return

    var defer = Q.defer()
    setTimeout(function () {
      defer.resolve(vals[1])
    })
    return defer.promise
  })
  var promise4 = promise3.fin(function () {
    counter++
  })

  Q.all([promise2, promise4])
    .then(function (data) {
      test.equal(counter, 2, "fin() should have been called twice")
      test.equal(data[0], vals[0], "first fin() should return the first val")
      test.equal(data[1], vals[1], "second fin() should return the second val")
      test.done()
    })
}

// test that fin() works with an asynchronous reject
exports.testAsynchronousFailAndFin = function (test) {
  var errs = []
  errs.push(new Error('nope 1'))
  errs.push(new Error('nope 2'))
  var counter = 0

  var defer = Q.defer()
  setTimeout(function () {
    defer.reject(errs[0])
  }, 10)
  var promise1 = defer.promise
  var promise2 = promise1.fin(function () {
    counter++
  })
  var promise3 = promise2.fail(function (e) {
    if (e !== errs[0]) return

    var defer = Q.defer()
    setTimeout(function () {
      defer.reject(errs[1])
    }, 10)

    return defer
  })
  var promise4 = promise3.fin(function () {
    counter++
  })

  // This expression fails when the first promise it contains fails, so
  // the order is promise2.fail -> all(...).fail -> promise4.fail
  Q.all([
    promise2.fail(function (e) {
      test.equal(e, errs[0])
    }),
    promise4.fail(function (e) {
      test.equal(e, errs[1])
      test.equal(counter, 2, "fin() should have been called twice")
      test.done()
    })
  ])
    .fail(function (data) {
      test.equal(counter, 1, "fin() should have been called once at this point")
    })
}

// test several thens chaining
exports.testChainedThens = function (test) {
  var promise1 = Q.resolve('a')
  var promise2 = promise1.then(function(data) {
    return data + 'b'
  })
  var promise3 = promise2.then(function (data) {
    return data + 'c'
  })
  // testing the same promise again to make sure they can run side by side
  var promise4 = promise2.then(function (data) {
    return data + 'c'
  })

  Q.all([promise1, promise2, promise3, promise4])
    .then(function (data) {
      test.equal(data[0], 'a')
      test.equal(data[1], 'ab')
      test.equal(data[2], 'abc')
      test.equal(data[3], 'abc')
      test.done()
    })
}

// test several fails chaining
exports.testChainedFails = function (test) {
  var errs = []
  errs.push(new Error("first err"))
  errs.push(new Error("second err"))
  errs.push(new Error("third err"))

  var promise1 = Q.reject(errs[0])
  var promise2 = promise1.fail(function (e) {
    return Q.reject(1)
  })
  var promise3 = promise2.fail(function (e) {
    return Q.reject(2)
  })
  var promise4 = promise2.fail(function (e) {
    return Q.reject(3)
  })

  Q.all([promise1, promise2, promise3, promise4])
  .fail(function (data) {
    test.equal(promise1.deref(), errs[0]);
    test.equal(promise2.deref(), 1);
    test.equal(promise3.deref(), 2);
    test.equal(promise4.deref(), 3);
    test.done()
  })
}

// test a fail and recovery
exports.testChainedFailRecoveries = function (test) {
  var errs = []
  errs.push(new Error("first err"))
  errs.push(new Error("second err"))
  errs.push(new Error("third err"))

  var promise1 = Q.reject(errs[0])
  var promise2 = promise1.fail(function (e) {
    return Q.resolve(1)
  })
  var promise3 = promise2.then(function (d) {
    return d + 1;
  })
  var promise4 = promise2.then(function (d) {
    return d + 2;
  })

  Q.all([promise2, promise3, promise4])
  .then(function (data) {
    test.equal(promise1.deref(), errs[0]);
    test.equal(promise2.deref(), 1);
    test.equal(promise3.deref(), 2);
    test.equal(promise4.deref(), 3);
    test.done()
  })
}

// test a chain of fail action
exports.testChainedFails = function (test) {
  var err = new Error("first err"),
      action = [];


  var promise1 = Q.reject(err)
  var promise2 = promise1.fail(function (e) {
    action.push(1)
  })
  var promise3 = promise2.fail(function (d) {
    action.push(2)
  })
  var promise4 = promise2.fail(function (d) {
    action.push(3)
  })

  Q.all([promise2, promise3, promise4])
  .fail(function (data) {
    test.equal(promise1.deref(), err);
    test.equal(promise2.deref(), err);
    test.equal(promise3.deref(), err);
    test.equal(promise4.deref(), err);
    test.equal(data, err);
    test.deepEqual(action, [1,2,3]);
    test.done()
  })
}

// test that we can call end without callbacks and not fail
exports.testEndNoCallbacks = function (test) {
  Q.resolve(true).end()
  test.ok("Ended successfully")
  test.done()
}

// test that we can call end with callbacks and fail
exports.testEndNoCallbacksThrows = function (test) {
  var testError = new Error('Testing')
  try {
    Q.reject(testError).end()
    test.fail("Should throw an error")
  } catch (e) {
    test.equal(e, testError, "Should throw the correct error")
  }
  test.done()
}

// test chaining when a promise returns a promise
exports.testChainedPromises = function (test) {
  var err = new Error('nope')
  var val = 'ok'

  var shouldFail = Q.reject(err)
  var shouldSucceed = Q.resolve(val)

  Q.resolve("start")
    .then(function () {
      return shouldFail
    })
    .fail(function (e) {
      if (e === err) return shouldSucceed
      else throw e
    })
    .then(function (data) {
      test.equal(data, val, "val should be returned")
      test.done()
    })
}

// test .end() is called with no parent scope (causing an uncaught exception)
exports.testChainedEndUncaught = function (test) {
  var errs = []
  errs.push(new Error('nope 1'))
  errs.push(new Error('nope 2'))
  errs.push(new Error('nope 3'))

  process.on('uncaughtException', function (e) {
    var i = errs.indexOf(e);
    if (i >= 0)
      errs.splice(i, 1)
    else
      test.fail("Error should be uncaught")
    // console.log(errs, errs.length);
    // FIXME: the error from promise2 is not raised
    if (errs.length === 1) test.done()
  })

  var defer = Q.defer()
  defer.promise.end()

  var promise1 = defer.promise
  var promise2 = promise1.fail(function (e) {
    return Q.reject(errs[1])
  })
  var promise3 = promise2.fail(function (e) {
    throw errs[2]
  })

  promise1.end()
  promise2.end()
  promise3.end()

  setTimeout(function () {
    defer.reject(errs[0])
  }, 10)
}

// test .end() is called with a parent scope and is caught
exports.testChainedCaught = function (test) {
  var err = new Error('nope')

  try {
    Q.reject(err).end()
  } catch (e) {
    test.equal(e, err, "Error should be caught")
    test.done()
  }
}

// test a mix of fails and thens
exports.testChainedMixed = function (test) {
  var errs = []
  errs.push(new Error('nope 1'))
  errs.push(new Error('nope 2'))
  errs.push(new Error('nope 3'))

  var vals = [3, 2, 1]

  var promise1 = Q.reject(errs[0])
  var promise2 = promise1.fail(function (e) {
    if (e === errs[0]) return Q.resolve(vals[0])
  })
  var promise3 = promise2.then(function (data) {
    if (data === vals[0]) throw errs[1]
  })
  var promise4 = promise3.fail(function (e) {
    if (e === errs[1]) return Q.resolve(vals[1])
  })
  var promise5 = promise4.then(function (data) {
    if (data === vals[1]) throw errs[2]
  })
  var promise6 = promise5.fail(function (e) {
    if (e === errs[2]) return Q.resolve(vals[2])
  })

  Q.all([
    promise1.fail(function (e) {
      return Q.resolve(e === errs[0])
    }),
    promise2.then(function (data) {
      return data === vals[0]
    }),
    promise3.fail(function (e) {
      return Q.resolve(e === errs[1])
    }),
    promise4.then(function (data) {
      return data === vals[1]
    }),
    promise5.fail(function (e) {
      return Q.resolve(e === errs[2])
    }),
    promise6.then(function (data) {
      return data === vals[2]
    })
  ])
  .then(function (data) {
    test.equal(data[0] && data[1] && data[2] && data[3] && data[4] && data[5], true, "All values should return true")
    test.done()
  })
}
