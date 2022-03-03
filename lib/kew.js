"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.stats = exports.isPromiseLike = exports.isPromise = exports.nfcall = exports.ncall = exports.bindPromise = exports.fcall = exports.delay = exports.allSettled = exports.all = exports.defer = exports.reject = exports.resolve = exports.KewPromise = exports.setNextTickFunction = exports.getNextTickFunction = void 0;
let nextTickFunction = process.nextTick;
function getNextTickFunction() {
    return nextTickFunction;
}
exports.getNextTickFunction = getNextTickFunction;
function setNextTickFunction(fn) {
    nextTickFunction = fn;
}
exports.setNextTickFunction = setNextTickFunction;
class KewPromise {
    constructor(nativePromise) {
        this.nativePromise = nativePromise;
        this[_a] = this.nativePromise[Symbol.toStringTag];
        this.fin = this.finally;
    }
    get promise() {
        return this;
    }
    static identity(x) {
        return x;
    }
    static throwErr(err) {
        throw err;
    }
    then(onFulfilled = KewPromise.identity, onRejected = KewPromise.throwErr) {
        const prom = defer();
        const nextTickOnFulfilled = (data) => {
            nextTickFunction(() => {
                let res;
                try {
                    res = onFulfilled(data);
                }
                catch (err) {
                    prom.reject(err);
                }
                prom.resolve(res);
            });
        };
        const nextTickOnRejected = (err) => {
            nextTickFunction(() => {
                let res;
                try {
                    res = onRejected(err);
                }
                catch (e) {
                    prom.reject(e);
                }
                prom.resolve(res);
            });
        };
        this.nativePromise.then(nextTickOnFulfilled, nextTickOnRejected);
        return prom.promise;
    }
    catch(onRejected) {
        return this.then(undefined, onRejected);
    }
    fail(onRejected) {
        return this.catch(onRejected);
    }
    thenBound(onFulfilled, thisObj, ...args) {
        return this.then(data => onFulfilled.apply(thisObj, [...args, data]));
    }
    failBound(onRejected, thisObj, ...args) {
        return this.catch(err => onRejected.apply(thisObj, [...args, err]));
    }
    // no-op, kept for backward-compatibility
    end() {
        return this;
    }
    // no-op, kept for backward-compatibility
    done() {
        return this;
    }
    finally(finalCallback) {
        const onFinally = (cb) => {
            return finalCallback ? Promise.resolve(finalCallback()).then(cb) : cb();
        };
        return this.then(result => onFinally(() => result), reason => onFinally(() => Promise.reject(reason)));
    }
    timeout(timeoutMs, timeoutMsg) {
        const deferred = defer();
        let hasTimeout = false;
        const timeoutId = setTimeout(() => {
            hasTimeout = true;
            deferred.reject(new Error(timeoutMsg !== null && timeoutMsg !== void 0 ? timeoutMsg : `Promise timeout after ${timeoutMs} ms.`));
        }, timeoutMs);
        this.nativePromise.then(data => {
            if (!hasTimeout) {
                clearTimeout(timeoutId);
                deferred.resolve(data);
            }
        }, err => {
            if (!hasTimeout) {
                clearTimeout(timeoutId);
                deferred.reject(err);
            }
        });
        return deferred.promise;
    }
}
exports.KewPromise = KewPromise;
_a = Symbol.toStringTag;
function resolve(val) {
    return new KewPromise(Promise.resolve(val));
}
exports.resolve = resolve;
function reject(val) {
    return new KewPromise(Promise.reject(val));
}
exports.reject = reject;
class KewDeferred {
    constructor() {
        this.promise = new KewPromise(new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        }));
        this.then = this.promise.then.bind(this.promise);
        this.catch = this.promise.catch.bind(this.promise);
        this.fail = this.promise.fail.bind(this.promise);
        this.thenBound = this.promise.thenBound.bind(this.promise);
        this.failBound = this.promise.failBound.bind(this.promise);
        this.timeout = this.promise.timeout.bind(this.promise);
        this.done = this.promise.done.bind(this.promise);
        this.end = this.promise.end.bind(this.promise);
        this.finally = this.promise.finally.bind(this.promise);
        this.fin = this.promise.fin.bind(this.promise);
        this[Symbol.toStringTag] = this.promise[Symbol.toStringTag];
    }
    makeNodeResolver() {
        return buildNodeResolver(this);
    }
}
Symbol.toStringTag;
function defer() {
    return new KewDeferred();
}
exports.defer = defer;
function all(promises, ...restPromises) {
    let arr;
    if (Array.isArray(promises)) {
        arr = promises;
    }
    else {
        arr = [promises, ...restPromises];
    }
    return new KewPromise(Promise.all(arr));
}
exports.all = all;
function allSettled(promises) {
    const promise = Promise.allSettled(promises).then(promises => {
        return promises.map(p => {
            if (p.status === 'fulfilled') {
                return { state: 'fulfilled', value: p.value };
            }
            else {
                return { state: 'rejected', reason: p.reason };
            }
        });
    });
    return new KewPromise(promise);
}
exports.allSettled = allSettled;
function delay(arg1, arg2) {
    let duration;
    let returnValue;
    if (typeof arg2 !== 'undefined') {
        duration = arg2;
        returnValue = arg1;
    }
    else {
        duration = arg1;
    }
    return new KewPromise(new Promise(resolve => {
        setTimeout(() => {
            resolve(returnValue);
        }, duration);
    }));
}
exports.delay = delay;
function fcall(fn, ...args) {
    const deferred = defer();
    nextTickFunction(() => {
        try {
            deferred.resolve(fn.apply(undefined, args));
        }
        catch (err) {
            deferred.reject(err);
        }
    });
    return deferred.promise;
}
exports.fcall = fcall;
function bindPromise(fn, thisObj, ...rootArgs) {
    return function onBoundPromise(...args) {
        const deferred = defer();
        try {
            const fnArgs = [...rootArgs, ...args, buildNodeResolver(deferred)];
            fn.apply(thisObj, fnArgs);
        }
        catch (err) {
            deferred.reject(err);
        }
        return deferred.promise;
    };
}
exports.bindPromise = bindPromise;
function ncall(fn, thisObj, ...args) {
    return bindPromise(fn, thisObj, ...args)();
}
exports.ncall = ncall;
function nfcall(fn, ...args) {
    return ncall(fn, undefined, ...args);
}
exports.nfcall = nfcall;
function buildNodeResolver(deferred) {
    return (err, data) => {
        if (err) {
            deferred.reject(err);
        }
        else {
            deferred.resolve(data);
        }
    };
}
function isPromise(prom) {
    return prom instanceof KewPromise;
}
exports.isPromise = isPromise;
function isPromiseLike(obj) {
    return (typeof obj === 'object' || typeof obj === 'function') && typeof obj.then === 'function';
}
exports.isPromiseLike = isPromiseLike;
// kept for retro-compatibility, this lib should not be responsible of this
function stats() {
    return {
        errorsEmitted: 0,
        errorsHandled: 0,
    };
}
exports.stats = stats;
