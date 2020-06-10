module.exports = class NedbRepository {

    constructor(nedb) {
        this.__nedb = nedb;
    }

    static create(nedb) {
        return new NedbRepository(nedb);
    }

    // return a promise
    getOneByPath(path, fields) {

        let self = this;

        return new Promise((resolve, reject) => {

            if (!fields) fields = {};

            self.__nedb.findOne({ path: path }, fields, (e, result) => {
                if (e)
                    return reject(e);

                // console.log('FIND ONE RESULT: ', result);

                resolve(result);
            });
        })
    }

    // return a promise
    update(upsertData) {

        const id = upsertData.path;
        // const params = upsertData.clonedParams;
        const params = upsertData.setParams;
        const options = upsertData.options;

        return new Promise((resolve, reject) => {

            this.__nedb.update({ _id: id }, params, options, (err, response, created, upserted, meta) => {

                if (err) {

                    //data with circular references can cause callstack exceeded errors
                    if (err.toString() === 'RangeError: Maximum call stack size exceeded')
                        return reject(new Error('callstack exceeded: possible circular data in happn set method'));

                    return reject(err);
                }

                resolve({ response, created, upserted, meta });
            });
        });
    }
}