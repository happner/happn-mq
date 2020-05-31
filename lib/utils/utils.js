const chalk = require('chalk');
const util = require('util');

module.exports = class Utils {

    constructor() { }

    static create() {
        return new Utils();
    }

    clone(obj) {

        let recurse = (obj) => {

            let cloned = null;

            for (let prop in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, prop)) {
                    if (typeof obj[prop] === 'object') {

                        if (cloned === null)
                            cloned = {};

                        cloned[prop] = recurse(obj[prop]);
                    } else if (obj[prop]) {
                        if (cloned === null)
                            cloned = {};

                        cloned[prop] = obj[prop];
                    }
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
}