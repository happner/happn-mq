
const hyperid = require('happner-hyperid').create({
    urlSafe: true
});

module.exports = class NedbDataService {

    constructor(config, logger, nedb, utils) {
        this.__config = config;
        this.__logger = logger;
        this.__nedb = nedb;
        this.__utils = utils;
    }

    static create(config, logger, nedb, utils) {
        return new NedbDataService(config, logger, nedb, utils);
    }

    // async processCount() {
    //     throw new Error('processCount not impelemented!');
    // }

    // async processGet() {
    //     throw new Error('processGet not impelemented!');
    // }

    // async processNoStore() {
    //     throw new Error('processNoStore not impelemented!');
    // }

    async processStore(message) {

        let response = await this.upsert(message.request);
        message.response = response;
        return message;
    }

    // async processSecureStore() {
    //     throw new Error('processSecureStore not impelemented!');
    // }

    // async processRemove() {
    //     throw new Error('processRemove not impelemented!');
    // }

    // async find() {
    //     throw new Error('find not impelemented!');
    // }

    // async findOne() {
    //     throw new Error('findOne not impelemented!');
    // }

    // async insert() {
    //     throw new Error('insert not impelemented!');
    // }

    // async remove() {
    //     throw new Error('remove not impelemented!');
    // }

    async upsert(msgObj) {

        this.__validate(msgObj);

        let upsertData = await this.__prepareUpsertData(msgObj);
        let upsertResult = await this.__update(upsertData);

        this.__updateMeta(upsertResult, upsertData);

        let transformed = this.__transform(upsertResult, upsertData);
        transformed.response = upsertResult.response;

        return transformed;
    }

    __validate(msgObj) {

        let errMsg = null;

        if (!msgObj.path)
            errMsg = 'No path defined';

        if (msgObj.options && msgObj.options.tag) {
            if (msgObj.data != null)
                errMsg == null ? 'Cannot set tag with new data.' : errMsg += '; Cannot set tag with new data.';
        }

        if (!msgObj.data)
            errMsg == null ? 'No data defined' : errMsg += '; No data defined';

        if (errMsg)
            throw new Error(errMsg);

        return msgObj;
    }

    async __prepareUpsertData(msgObj) {

        let path = msgObj.path;
        let data = msgObj.data;
        let options = msgObj.options || {};

        options.upsert = true;

        if (data)
            delete data._meta;

        // siblings

        if (options.set_type === 'sibling') {
            //appends an item with a path that matches the message path - but made unique by a shortid at the end of the path
            // if (!_s.endsWith(path, '/'))
            if (path.indexOf('/') !== (path.length - 1))
                path += '/';

            path += hyperid();
        }

        let setData = this.__formatSetData(path, data);

        // tags
        if (options.tag) {
            if (data != null)
                throw new Error('Cannot set tag with new data.');

            setData.data = {};
            options.merge = true;
        }

        // merge
        if (options.merge) {

            let existing = await this.__getOneByPath(path, null);

            if (!existing)
                options.upsertType = 2; //just inserting
            else {
                console.log('EXISTING: ', existing);

                for (var propertyName in existing.data)
                    if (setData.data[propertyName] == null)
                        setData.data[propertyName] = existing.data[propertyName];

                setData.created = existing.created;
                setData.modified = Date.now();
                setData._id = existing._id;

                options.updateType = 1; //updating
            }
        }

        // TODO: increment

        // if (options.increment != null)... 

        let setParams = {
            $set: {
                data: setData.data,
                _id: path,
                path: path,
                modifiedBy: options.modifiedBy,
                _tag: setData._tag
            }
        };

        let clonedParams = this.__utils.clone(setParams);

        let result = {
            setParams: setParams, 
            clonedParams: clonedParams,
            path: path,
            data: data,
            options: options,
            setData: setData
        };

        return result;
    }

    __updateMeta(updatedResult, preparedParams) {

        if (updatedResult.meta)
            updatedResult.meta.path = updatedResult.meta._id;
        else
            updatedResult.meta = this.__getMeta(updatedResult.created || preparedParams.setParams.$set);
    }

    __formatSetData(path, data, options) {

        if (typeof data !== 'object' || data instanceof Array === true ||
            data instanceof Date === true || data == null)
            data = {
                value: data
            };

        let result = {
            data: data,
            _meta: {
                path: path
            }
        };

        if (options && options.modifiedBy)
            result._meta.modifiedBy = options.modifiedBy;
        else
            result._meta.path = path;

        return result;
    }

    __transform(upsertResult, upsertData) {

        let dataObj = null;

        if (upsertResult.created)
            dataObj = upsertResult.created;
        else {
            upsertData.setData.path = upsertData.path;
            dataObj = upsertData.setData;
        }

        let transformed = {
            data: dataObj.data
        };

        if (!upsertResult.meta) {
            upsertResult.meta = {};

            if (dataObj.created) upsertResult.meta.created = dataObj.created;

            if (dataObj.modified) upsertResult.meta.modified = dataObj.modified;

            if (dataObj.modifiedBy) upsertResult.meta.modifiedBy = dataObj.modifiedBy;
        }

        transformed._meta = upsertResult.meta;

        if (!dataObj._id) {
            transformed._meta._id = transformed.path;
        } else {
            transformed._meta.path = dataObj._id;
            transformed._meta._id = dataObj._id;
        }

        if (dataObj._tag) transformed._meta.tag = dataObj._tag;

        return transformed;
    }

    __getMeta(response) {

        return {
            created: response.created,
            modified: response.modified,
            modifiedBy: response.modifiedBy,
            path: response._id || response.path,
            _id: response._id || response.path
        };
    }

    /* 
    NEDB database operations
    */

    // return a promise
    __getOneByPath(path, fields) {


        let self = this;

        return new Promise((resolve, reject) => {

            if (!fields) fields = {};

            self.__nedb.findOne({ path: path }, fields, (e, result) => {
                if (e)
                    return reject(e);

                resolve(result);
            });
        })
    }

    // return a promise
    async __update(upsertData) {

        const id = upsertData.path;
        const params = upsertData.clonedParams;
        const options = upsertData.options;

        let exec = () => {

            let self = this;

            return new Promise((resolve, reject) => {

                self.__nedb.update({ _id: id }, params, options, (err, response, created, upserted, meta) => {

                    if (err) {

                        //data with circular references can cause callstack exceeded errors
                        if (err.toString() === 'RangeError: Maximum call stack size exceeded')
                            return reject(new Error('callstack exceeded: possible circular data in happn set method'));

                        return reject(err);
                    }

                    console.log('RESPONSE: ', response);
                    console.log('CREATED: ', created);
                    console.log('UPSERTED: ', upserted);
                    console.log('META: ', meta);

                    resolve({ response, created, upserted, meta });
                });
            });
        }

        return await exec();
    }
}