const Q = require('../lib/kew')

describe('kew', () => {
  beforeEach(() => {
    expect.hasAssertions()
  })

  describe('resolve', () => {
    it('should return a promise', async () => {
      const val = Q.resolve(12)
      expect(val).toBeInstanceOf(Q.KewPromise)
      val.then(x => {
        expect(x).toEqual(12)
      })
      expect(await val).toEqual(12)
    })
  })

  describe('reject', () => {
    it('should return a promise', async () => {
      const val = Q.reject(new Error('failed'))
      expect(val).toBeInstanceOf(Q.KewPromise)
      val.catch(e => {
        expect(e).toBeInstanceOf(Error)
        expect(e.message).toEqual('failed')
      })
      try {
        await val
      } catch (e) {
        expect(e).toBeInstanceOf(Error)
        expect(e.message).toEqual('failed')
      }
    })
  })

  describe('defer', () => {
    test('promise', () => {
      const defer = Q.defer()
      expect(defer.promise).toBeInstanceOf(Q.KewPromise)
    })

    test('resolve', async () => {
      const defer = Q.defer()
      defer.resolve(12)
      expect(await defer.promise).toEqual(12)
    })

    test('reject', async () => {
      const defer = Q.defer()
      defer.reject(new Error('failed'))
      try {
        await defer.promise
      } catch (e) {
        expect(e).toBeInstanceOf(Error)
        expect(e.message).toEqual('failed')
      }
    })

    describe('makeNodeResover', () => {
      it('should reject if resolver is given an error', () => {
        const defer = Q.defer()
        defer.makeNodeResolver()(new Error('failed'), null)

        return defer.promise.catch(err => {
          expect(err).toBeInstanceOf(Error)
          expect(err.message).toEqual('failed')
        })
      })

      it('should resolve if resolver is not given any error', () => {
        const defer = Q.defer()
        defer.makeNodeResolver()(null, 'foo')

        return defer.promise.then(val => {
          expect(val).toEqual('foo')
        })
      })
    })
  })

  describe('promise interface', () => {
    describe('then', () => {
      testOnPromiseAndDefer({value: 'foo'}, promise => {
        return promise.then(x => {
          expect(x).toEqual('foo')
        })
      })
    })

    describe('catch', () => {
      testOnPromiseAndDefer({reason: 'err'}, p => {
        return p.catch(x => {
          expect(x).toEqual('err')
        })
      })
    })

    describe('fail', () => {
      testOnPromiseAndDefer({reason: 'err'}, p => {
        return p.fail(x => {
          expect(x).toEqual('err')
        })
      })
    })

    describe('chaining', () => {
      testOnPromiseAndDefer({value: 'foo'}, p => {
        return p
          .then(val => {
            expect(val).toEqual('foo')
            return val.length
          })
          .then(val => {
            expect(val).toEqual(3)
            return {bli: 'bar'}
          })
          .then(({bli}) => {
            expect(bli).toEqual('bar')
          })
      })
    })

    describe('chaining while returning promises', () => {
      testOnPromiseAndDefer({value: 'foo'}, p => {
        return p
          .then(val => {
            expect(val).toEqual('foo')
            return Q.resolve('bar')
          })
          .then(val => {
            expect(val).toEqual('bar')
            return val
          })
          .then(val => {
            expect(val).toEqual('bar')
            return Promise.resolve(12)
          })
          .then(val => {
            expect(val).toEqual(12)
          })
      })
    })

    describe('chaining with fail', () => {
      testOnPromiseAndDefer({reason: 'err'}, p => {
        return p
          .fail(e => {
            expect(e).toEqual('err')
            return 12
          })
          .then(val => {
            expect(val).toEqual(12)
            return Q.reject('err again')
          })
          .fail(e => {
            expect(e).toEqual('err again')
          })
      })
    })

    describe('chaining with catch', () => {
      testOnPromiseAndDefer({reason: 'err'}, p => {
        return p
          .catch(e => {
            expect(e).toEqual('err')
            return 12
          })
          .then(val => {
            expect(val).toEqual(12)
            return Q.reject('err again')
          })
          .catch(e => {
            expect(e).toEqual('err again')
          })
      })
    })

    describe('finally', () => {
      describe('after success', () => {
        testOnPromiseAndDefer({value: 12}, p => {
          const thenCb = jest.fn()
          const failCb = jest.fn()
          const finalCb = jest.fn()

          return p
            .then(thenCb)
            .catch(failCb)
            .finally(finalCb)
            .then(() => {
              expect(thenCb).toHaveBeenCalledWith(12)
              expect(failCb).not.toHaveBeenCalled()
              expect(finalCb).toHaveBeenCalled()
            })
        })
      })

      describe('after failure', () => {
        testOnPromiseAndDefer({reason: new Error('failed')}, p => {
          const thenCb = jest.fn()
          const failCb = jest.fn()
          const finalCb = jest.fn()

          return p
            .then(thenCb)
            .catch(failCb)
            .finally(finalCb)
            .then(() => {
              expect(thenCb).not.toHaveBeenCalled()
              expect(failCb).toHaveBeenCalled()
              expect(finalCb).toHaveBeenCalled()
            })
        })
      })
    })

    describe('fin', () => {
      describe('after success', () => {
        testOnPromiseAndDefer({value: 12}, p => {
          const thenCb = jest.fn()
          const failCb = jest.fn()
          const finalCb = jest.fn()

          return p
            .then(thenCb)
            .catch(failCb)
            .fin(finalCb)
            .then(() => {
              expect(thenCb).toHaveBeenCalledWith(12)
              expect(failCb).not.toHaveBeenCalled()
              expect(finalCb).toHaveBeenCalled()
            })
        })
      })

      describe('after failure', () => {
        testOnPromiseAndDefer({reason: new Error('failed')}, p => {
          const thenCb = jest.fn()
          const failCb = jest.fn()
          const finalCb = jest.fn()

          return p
            .then(thenCb)
            .catch(failCb)
            .fin(finalCb)
            .then(() => {
              expect(thenCb).not.toHaveBeenCalled()
              expect(failCb).toHaveBeenCalled()
              expect(finalCb).toHaveBeenCalled()
            })
        })
      })
    })

    describe('timeout', () => {
      describe('should do nothing if the task finishes before the timeout', () => {
        test('promise', () => {
          const deferred = Q.defer()
          setTimeout(() => deferred.resolve('foo'), 50)
          return deferred.promise.timeout(500, 'too long to complete').then(val => {
            expect(val).toEqual('foo')
          })
        })

        test('defer', () => {
          const deferred = Q.defer()
          setTimeout(() => deferred.resolve('foo'), 50)
          return deferred.timeout(500, 'too long to complete').then(val => {
            expect(val).toEqual('foo')
          })
        })
      })

      describe('should reject is the task is longer than the timeout', () => {
        test('promise', () => {
          const deferred = Q.defer()
          setTimeout(() => deferred.resolve('foo'), 100)
          return deferred.promise.timeout(50, 'too long to complete').catch(err => {
            expect(err).toEqual(new Error('too long to complete'))
          })
        })

        test('defer', () => {
          const deferred = Q.defer()
          setTimeout(() => deferred.resolve('foo'), 100)
          return deferred.timeout(50, 'too long to complete').catch(err => {
            expect(err).toEqual(new Error('too long to complete'))
          })
        })
      })
    })

    describe('bound callbacks', () => {
      const successMock = jest.fn()
      const errorMock = jest.fn()

      beforeEach(() => {
        successMock.mockClear()
        errorMock.mockClear()
      })

      function Obj() {
        this.attr = 'foo'
      }
      Obj.prototype.logSuccess = function (span, data) {
        successMock(`span: ${span}, attr: ${this.attr} succeed with ${data}`)
      }
      Obj.prototype.logFailure = function (span, err) {
        errorMock(`span: ${span}, attr: ${this.attr} failed with ${err.message}`)
      }

      describe('thenBound', () => {
        testOnPromiseAndDefer({value: 'username'}, promise => {
          const obj = new Obj()
          const span = 'fetchUser'
          return promise
            .thenBound(obj.logSuccess, obj, span)
            .failBound(obj.logFailure, obj, span)
            .then(() => {
              expect(successMock).toHaveBeenCalledWith(
                `span: fetchUser, attr: foo succeed with username`
              )
              expect(errorMock).not.toHaveBeenCalled()
            })
        })
      })

      describe('failBound', () => {
        testOnPromiseAndDefer({reason: new Error('not found')}, promise => {
          const obj = new Obj()
          const span = 'fetchUser'
          return promise
            .thenBound(obj.logSuccess, obj, span)
            .failBound(obj.logFailure, obj, span)
            .then(() => {
              expect(successMock).not.toHaveBeenCalled()
              expect(errorMock).toHaveBeenCalledWith(
                `span: fetchUser, attr: foo failed with not found`
              )
            })
        })
      })
    })

    describe('end', () => {
      describe('should return the underlying promise', () => {
        describe('promise', () => {
          test('success', () => {
            const p = Q.resolve(12)
            expect(p.end()).toStrictEqual(p)
          })

          test('failure', () => {
            const p = Q.reject(new Error('failed'))
            const p2 = p.end()
            expect(p2).toStrictEqual(p)
            // jest is not happy if the rejection is not caught here
            return p.catch(() => null)
          })
        })

        describe('deferred', () => {
          test('without resolving', () => {
            const def = Q.defer()
            expect(def.end()).toStrictEqual(def.promise)
          })

          test('resolving', () => {
            const def = Q.defer()
            def.resolve(12)
            expect(def.end()).toStrictEqual(def.promise)
          })

          test('rejecting', () => {
            const def = Q.defer()
            def.reject(new Error('failed'))
            expect(def.end()).toStrictEqual(def.promise)
            // jest is not happy if the rejection is not caught here
            return def.catch(() => null)
          })
        })
      })
    })

    describe('done', () => {
      describe('should return the underlying promise', () => {
        describe('promise', () => {
          test('success', () => {
            const p = Q.resolve(12)
            expect(p.done()).toStrictEqual(p)
          })

          test('failure', () => {
            const p = Q.reject(new Error('failed'))
            const p2 = p.done()
            expect(p2).toStrictEqual(p)
            // jest is not happy if the rejection is not caught here
            return p.catch(() => null)
          })
        })

        describe('deferred', () => {
          test('without resolving', () => {
            const def = Q.defer()
            expect(def.done()).toStrictEqual(def.promise)
          })

          test('resolving', () => {
            const def = Q.defer()
            def.resolve(12)
            expect(def.done()).toStrictEqual(def.promise)
          })

          test('rejecting', () => {
            const def = Q.defer()
            def.reject(new Error('failed'))
            expect(def.done()).toStrictEqual(def.promise)
            // jest is not happy if the rejection is not caught here
            return def.catch(() => null)
          })
        })
      })
    })
  })

  describe('all', () => {
    const promises = [
      Q.resolve('foo'),
      Q.resolve('bar'),
      Q.resolve('baz'),
      Q.resolve(12),
      Q.resolve(null),
    ]

    it('should return all resolved values in the same order', () => {
      return Q.all(promises).then(([a, b, c, d, e]) => {
        expect(a).toEqual('foo')
        expect(b).toEqual('bar')
        expect(c).toEqual('baz')
        expect(d).toEqual(12)
        expect(e).toEqual(null)
      })
    })

    it('should return with await', async () => {
      const [a, b, c, d, e] = await Q.all(promises)
      expect(a).toEqual('foo')
      expect(b).toEqual('bar')
      expect(c).toEqual('baz')
      expect(d).toEqual(12)
      expect(e).toEqual(null)
    })

    it('should fail if one the promise failed', () => {
      const p = [Q.resolve(12), Q.reject(new Error('failed'))]
      return Q.all(p).catch(e => {
        expect(e).toBeInstanceOf(Error)
        expect(e.message).toEqual('failed')
      })
    })
  })

  describe('delay', () => {
    it('should resolve after the given duration', () => {
      const start = Date.now()
      return Q.delay(200).then(() => {
        const ellapsed = Date.now() - start
        expect(ellapsed).toBeGreaterThanOrEqual(200)
      })
    })

    it('should pass the resolved value if provided', () => {
      const start = Date.now()
      return Q.delay('myValue', 200).then(val => {
        const ellapsed = Date.now() - start
        expect(ellapsed).toBeGreaterThanOrEqual(200)
        expect(val).toEqual('myValue')
      })
    })
  })

  describe('fcall', () => {
    it('should resolve if the function returns', () => {
      const f = () => 8
      return Q.fcall(f).then(val => expect(val).toEqual(8))
    })

    it('pass args properly', () => {
      const f = (a, b, c) => `${a},${b},${c}`
      return Q.fcall(f, 1, 2, 3).then(val => expect(val).toEqual('1,2,3'))
    })

    it('should delay invocation until next tick', done => {
      let called = false
      const f = () => {
        called = true
      }
      Q.fcall(f).then(() => {
        expect(called).toBeTruthy()
        done()
      })
      expect(called).toBeFalsy()
    })

    it("should return the resolved value if fcall'ed function returns a promise", () => {
      const f = () => Q.resolve(4)
      return Q.fcall(f).then(val => {
        expect(val).toEqual(4)
      })
    })

    it("should reject if the fcall'ed function throws an error", () => {
      const f = () => {
        throw new Error('failed')
      }
      return Q.fcall(f)
        .then(() => expect(true).toBeFalsy())
        .catch(e => {
          expect(e).toBeInstanceOf(Error)
          expect(e.message).toEqual('failed')
        })
    })
  })

  describe('ncall', () => {
    const dbMock = jest.fn()

    beforeEach(() => {
      dbMock.mockClear()
    })

    function Obj() {
      this.attr = 'foo'
    }
    Obj.prototype.dbCall = function (query, callback) {
      const res = dbMock(query)
      if (res instanceof Error) {
        callback(res, undefined)
      } else {
        callback(undefined, {...res, attr: this.attr})
      }
    }

    it('should resolve in case of success', () => {
      dbMock.mockReturnValueOnce({id: '1'})
      const obj = new Obj()
      return Q.ncall(obj.dbCall, obj, 'userId=1').then(val => {
        expect(dbMock).toHaveBeenCalledWith('userId=1')
        expect(val).toEqual({id: '1', attr: 'foo'})
      })
    })

    it('should reject in case of failure', () => {
      dbMock.mockReturnValueOnce(new Error('failed'))
      const obj = new Obj()
      return Q.ncall(obj.dbCall, obj, 'userId=1').catch(err => {
        expect(dbMock).toHaveBeenCalledWith('userId=1')
        expect(err).toBeInstanceOf(Error)
        expect(err.message).toEqual('failed')
      })
    })
  })

  describe('nfcall', () => {
    const dbMock = jest.fn()

    beforeEach(() => {
      dbMock.mockClear()
    })

    const asyncCall = (query, callback) => {
      const res = dbMock(query)
      if (res instanceof Error) {
        callback(res, undefined)
      } else {
        callback(undefined, res)
      }
    }

    it('should resolve in case of success', () => {
      dbMock.mockReturnValueOnce({id: '1'})
      return Q.nfcall(asyncCall, 'userId=1').then(val => {
        expect(dbMock).toHaveBeenCalledWith('userId=1')
        expect(val).toEqual({id: '1'})
      })
    })

    it('should reject in case of failure', () => {
      dbMock.mockReturnValueOnce(new Error('failed'))
      return Q.nfcall(asyncCall, 'userId=1').catch(err => {
        expect(dbMock).toHaveBeenCalledWith('userId=1')
        expect(err).toBeInstanceOf(Error)
        expect(err.message).toEqual('failed')
      })
    })
  })

  describe('bindPromise', () => {
    const dbMock = jest.fn()
    beforeEach(() => {
      dbMock.mockClear()
    })

    it('should bind the function with the root arguments', () => {
      const fn = (query, callback) => {
        const res = dbMock(query)
        if (res instanceof Error) {
          callback(res, null)
        } else {
          callback(null, res)
        }
      }

      dbMock.mockReturnValue({id: '1'})
      const promised = query => Q.bindPromise(fn, undefined, query)()
      return promised('userId=1').then(val => {
        expect(val).toEqual({id: '1'})
      })
    })

    it('should bind the function with the non-root arguments', () => {
      const fn = (query, callback) => {
        const res = dbMock(query)
        if (res instanceof Error) {
          callback(res, null)
        } else {
          callback(null, res)
        }
      }

      dbMock.mockReturnValue({id: '1'})
      const promised = query => Q.bindPromise(fn, undefined)(query)
      return promised('userId=1').then(val => {
        expect(val).toEqual({id: '1'})
      })
    })
  })

  describe('allSettled', () => {
    it('should return the state object for each promises', () => {
      const defer = Q.defer()
      const promises = [Q.resolve(12), Q.reject(new Error('failed')), defer.promise]

      setTimeout(() => defer.resolve('foo'), 100)
      return Q.allSettled(promises).then(status => {
        expect(status).toEqual([
          {state: 'fulfilled', value: 12},
          {state: 'rejected', reason: new Error('failed')},
          {state: 'fulfilled', value: 'foo'},
        ])
      })
    })
  })
})

/**
 * Allow to run all tests on a promise and a deferred, because deferred are also used as if they were a promise
 * @param {*} options Object containing attribute "value" for a resolved promised or "reason" for a rejected one
 * @param {*} callback function receiving the built promise, containing the test code
 */
function testOnPromiseAndDefer(options, callback) {
  test('promise', () => {
    const promise = options.value ? Q.resolve(options.value) : Q.reject(options.reason)
    return callback(promise)
  })

  test('deferred', () => {
    const deferred = Q.defer()
    if (options.value) {
      deferred.resolve(options.value)
    } else {
      deferred.reject(options.reason)
    }
    return callback(deferred)
  })
}
