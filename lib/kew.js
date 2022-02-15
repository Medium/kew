"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.nfcall = exports.ncall = exports.fcall = exports.delay = exports.all = exports.defer = exports.reject = exports.resolve = exports.KewPromise = void 0;
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
    finally(finalCallback) {
        const onFinally = (cb) => {
            return finalCallback ? Promise.resolve(finalCallback()).then(cb) : cb;
        };
        const promise = this.nativePromise.then(result => onFinally(() => result), reason => onFinally(() => Promise.reject(reason)));
        return new KewPromise(promise);
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
function defer() {
    let res;
    let rej;
    const promise = new Promise((resolve, reject) => {
        res = resolve;
        rej = reject;
    });
    return {
        resolve: res,
        reject: rej,
        promise: new KewPromise(promise),
    };
}
exports.defer = defer;
function all(promises) {
    return new KewPromise(Promise.all(promises));
}
exports.all = all;
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
    process.nextTick(() => {
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
function ncall(fn, thisObj, ...args) {
    const deferred = defer();
    try {
        const fnArgs = [...args, makeNodeResolver(deferred)];
        fn.apply(thisObj, fnArgs);
    }
    catch (err) {
        deferred.reject(err);
    }
    return deferred.promise;
}
exports.ncall = ncall;
function nfcall(fn, ...args) {
    return ncall(fn, undefined, ...args);
}
exports.nfcall = nfcall;
function makeNodeResolver(deferred) {
    return (err, data) => {
        if (err) {
            deferred.reject(err);
        }
        else {
            deferred.resolve(data);
        }
    };
}
