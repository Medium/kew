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
    then(onFulfilled, onRejected) {
        return new KewPromise(this.nativePromise.then(onFulfilled, onRejected));
    }
    catch(onRejected) {
        return new KewPromise(this.nativePromise.catch(onRejected));
    }
    fail(onRejected) {
        return new KewPromise(this.nativePromise.catch(onRejected));
    }
    // no-op, kept for backward-compatibility
    end() { }
    done() { }
    finally(finalCallback) {
        const onFinally = (cb) => {
            return finalCallback ? Promise.resolve(finalCallback()).then(cb) : cb;
        };
        const promise = this.nativePromise.then(result => onFinally(() => result), reason => onFinally(() => Promise.reject(reason)));
        return new KewPromise(promise);
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
        const promise = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
        this.promise = new KewPromise(promise);
    }
    makeNodeResolver() {
        return buildNodeResolver(this);
    }
}
function defer() {
    return new KewDeferred();
}
exports.defer = defer;
function all(promises) {
    return new KewPromise(Promise.all(promises));
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
