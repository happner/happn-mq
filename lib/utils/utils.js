const chalk = require('chalk');
const util = require('util');

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

            console.log(chalk.blueBright(`\n~~~~~~~~~~~~~~~~~~ START trace '${objName}.${funcName}' ~~~~~~~~~~~~~~~~~~`));

            let funcType = 'async';
            let result = null;
            let start = Date.now();

            try {
                result = await orig.apply(this, args);
            } catch (err) {
                result = err;
            }

            let finish = Date.now();

            console.log(`- function type: ${chalk.green(funcType)}`);
            console.log(`- function name: ${chalk.green(funcName)}`);
            console.log(`- start: ${chalk.green(start)}`);
            console.log(`- end: ${chalk.green(finish)}`);
            console.log('- duration: ', chalk.green(`${finish - start}ms`));
            console.log('- result: ', result instanceof Error ? chalk.red(util.inspect(result)) : chalk.green(util.inspect(result)));
            console.log(chalk.blueBright(`~~~~~~~~~~~~~~~~~~ END trace '${objName}.${funcName}' ~~~~~~~~~~~~~~~~~~\n`));

            if (result instanceof Error)
                throw result;
            else
                return result
        };
    }

    __processFunc(orig, objName, funcName) {

        return function (...args) {

            let result = null;
            let funcType = null;

            let writeLog = (start, funcType, funcName, loggedResult) => {

                let finish = Date.now();

                console.log(chalk.blueBright(`\n~~~~~~~~~~~~~~~~~~ START trace '${objName}.${funcName}' ~~~~~~~~~~~~~~~~~~`));
                console.log(`- function type: ${chalk.green(funcType)}`);
                console.log(`- function name: ${chalk.green(funcName)}`);
                console.log(`- start: ${chalk.green(start)}`);
                console.log(`- end: ${chalk.green(finish)}`);
                console.log('- duration: ', chalk.green(`${finish - start}ms`));
                console.log('- result: ', loggedResult instanceof Error ? chalk.red(util.inspect(loggedResult)) : chalk.green(util.inspect(loggedResult)));
                console.log(chalk.blueBright(`~~~~~~~~~~~~~~~~~~ END trace '${objName}.${funcName}' ~~~~~~~~~~~~~~~~~~\n`));
            }

            let start = Date.now();

            try {
                result = orig.apply(this, args);

                if (result instanceof Promise) {
                    funcType = 'promise';

                    // resolve the promise so that we can trace the result
                    return (result
                        .then(resolved => {

                            writeLog(start, funcType, funcName, resolved);

                            // now create a new promise to return, using the resolved result
                            return new Promise((resolve, reject) => {
                                resolve(resolved);
                            });
                        })
                        .catch(err => {

                            writeLog(start, funcType, funcName, err);

                            return new Promise((resolve, reject) => {
                                reject(err);
                            });
                        }))
                } else {
                    funcType = 'synchronous';
                    writeLog(start, funcType, funcName, result);
                    return result;
                }
            } catch (err) {
                writeLog(start, funcType, funcName, err);
                throw err;
            }
        };
    }
}