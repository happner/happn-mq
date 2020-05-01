
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

    async processCount() {
        throw new Error('processCount not impelemented!');
    }

    async processGet() {
        throw new Error('processGet not impelemented!');
    }

    async processNoStore() {
        throw new Error('processNoStore not impelemented!');
    }

    async processStore(message) {

        let response = await this.upsert(message.request);
        message.response = response;
        return message;
    }

    async processSecureStore() {
        throw new Error('processSecureStore not impelemented!');
    }

    async processRemove() {
        throw new Error('processRemove not impelemented!');
    }

    async find() {
        throw new Error('find not impelemented!');
    }

    async findOne() {
        throw new Error('findOne not impelemented!');
    }

    async insert() {
        throw new Error('insert not impelemented!');
    }

    async remove() {
        throw new Error('remove not impelemented!');
    }

    async upsert(msgObj) {

        let upsertData = await this.__prepareUpsertData(msgObj);
        let upsertResult = await this.__update({ _id: upsertData.path }, upsertData.clonedParams.$set, upsertData.options);

        this.__updateMeta(upsertResult, upsertData);

        let transformed = this.__transform(upsertResult, upsertData);
        transformed.response = upsertResult.response;

        return transformed;
    }

    async  __prepareUpsertData(msgObj) {

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

        // WITHOUT THIS, IF YOU REPLAY THE SAME 'SET' REQUEST, YOU WILL GET UNIQUE CONSTRAINT VIOLATION ERROR
        if (options.merge) {

            let existing = await this.__getOneByPath(path, null);

            if (!existing)
                options.upsertType = 2; //just inserting
            else {
                for (var propertyName in existing.data)
                    if (setData.data[propertyName] == null)
                        setData.data[propertyName] = existing.data[propertyName];

                setData.created = existing.created;
                setData.modified = Date.now();
                setData._id = existing._id;

                options.updateType = 1; //updating
            }
        }

        // increment

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

        if (
            typeof data !== 'object' ||
            data instanceof Array === true ||
            data instanceof Date === true ||
            data == null
        )
            data = {
                value: data
            };

        if (options && options.modifiedBy)
            return {
                data: data,
                _meta: {
                    path: path,
                    modifiedBy: options.modifiedBy
                }
            };

        return {
            data: data,
            _meta: {
                path: path
            }
        };
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

        // this.__logger.debug(`finding by path: ${path}`);

        let self = this;

        return new Promise((resolve, reject) => {

            self.__nedb.findOne({ path: path }, fields || {}, (e, result) => {
                if (e)
                    return reject(e);

                // this.__logger.debug('found: ', result);

                return resolve(result);
            });
        })
    }

    // return a promise
    async __update(id, params, options) {

        let self = this;

        let exec = () => {
            return new Promise((resolve, reject) => {

                self.__nedb.update({ _id: id }, params, options, (err, response, created, upserted, meta) => {

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

        let result = await exec();

        return result;

    }
}