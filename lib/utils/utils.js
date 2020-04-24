module.exports = class Utils {

    constructor() { }

    static create() {
        return new Utils();
    };

    clone(obj) {

        let recurse = (obj) => {

            let cloned = {};

            for (let prop in obj) {
                if (obj.hasOwnProperty(prop)) {
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
    };
}