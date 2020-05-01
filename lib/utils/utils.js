module.exports = class Utils {

    constructor() { }

    static create() {
        return new Utils();
    }

    clone(obj) {

        let recurse = (obj) => {

            let cloned = {};

            for (let prop in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, prop)) {
                    if (typeof obj[prop] === 'object') {
                        cloned[prop] = recurse(obj[prop]);
                    } else if (obj[prop])
                        cloned[prop] = obj[prop];
                }
            }

            return cloned;
        };

        return recurse(obj);
    }

    // functional helper for chaining functions and 'piping' x through them
    compose(f, g) {
        return (x) => {
            return f(g(x));
        };
    }

    // intercept method calls on an object function
    traceMethodCalls(obj) {

        let self = this;

        let handler = {

            get(target, prop, receiver) {

                const orig = Reflect.get(target, prop, receiver);
                // const orig = target[prop];

                if (typeof orig === "function") {

                    let objName = target.constructor.name;
                    let funcName = prop;

                    // if (objName.length > 0) {
                    if (orig[Symbol.toStringTag] === 'AsyncFunction')
                        return self.__processAsyncFunc(orig, objName, funcName);
                    else
                        return self.__processFunc(orig, objName, funcName);
                    // }

                } else {
                    return orig;
                }
            }
        };

        return new Proxy(obj, handler);
    }

    __processAsyncFunc(orig, objName, funcName) {

        return async function (...args) {

            console.log(`\n~~~~~~~~~~~~~~~~~~ START trace '${objName}.${funcName}' ~~~~~~~~~~~~~~~~~~`);

            let result = null;
            let start = Date.now();

            try {
                result = await orig.apply(this, args);
            } catch (err) {
                result = err;
            }

            let finish = Date.now();

            console.log('- function type: async');
            console.log(`- function name: ${funcName}`);
            console.log(`- start: ${start}`);
            console.log(`- end: ${finish}`);
            console.log(`- duration: ${finish - start}ms`);
            console.log('- params: ', args);
            console.log('- result: ', result);
            console.log(`~~~~~~~~~~~~~~~~~~ END trace '${objName}.${funcName}' ~~~~~~~~~~~~~~~~~~\n`);

            if (typeof result === Error)
                throw result;
            else
                return result
        };
    }

    __processFunc(orig, objName, funcName) {

        return function (...args) {

            console.log(`\n~~~~~~~~~~~~~~~~~~ START trace '${objName}.${funcName}' ~~~~~~~~~~~~~~~~~~`);

            let result = null;
            let loggedResult = null;
            let funcType = null;

            let start = Date.now();

            try {
                result = orig.apply(this, args);

                if (result instanceof Promise) {
                    funcType = 'promise';

                    // resolve the promise so that we can trace the result
                    result
                        .then(resolved => {
                            loggedResult = resolved;

                            // now create a new promise to return, using the resolved result
                            result = new Promise((resolve, reject) => {
                                resolve(resolved);
                            });
                        })
                        .catch(err => {
                            loggedResult = err;

                            result = new Promise((resolve, reject) => {
                                reject(err);
                            });
                        })
                } else {
                    funcType = 'synchronous';
                    loggedResult = result;
                }
            } catch (err) {
                loggedResult = err;
                result = err;
            }

            let finish = Date.now();

            console.log(`- function type: ${funcType}`);
            console.log(`- function name: ${funcName}`);
            console.log(`- start: ${start}`);
            console.log(`- end: ${finish}`);
            console.log(`- duration: ${finish - start}ms`);
            console.log('- result: ', loggedResult);
            console.log(`~~~~~~~~~~~~~~~~~~ END trace '${objName}.${funcName}' ~~~~~~~~~~~~~~~~~~\n`);

            if (typeof result === Error)
                throw result;
            else
                return result;

        };
    }
}