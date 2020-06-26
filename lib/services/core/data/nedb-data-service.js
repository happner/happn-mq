
const hyperid = require('happner-hyperid').create({
    urlSafe: true
});

module.exports = class NedbDataService {

    constructor(config, logger, nedbRepository, utils, upsertBuilder) {
        this.__config = config;
        this.__logger = logger;
        this.__nedbRepository = nedbRepository;
        this.__utils = utils;
        this.__upsertBuilder = upsertBuilder;
    }

    static create(config, logger, nedbRepository, utils, upsertBuilder) {
        return new NedbDataService(config, logger, nedbRepository, utils, upsertBuilder);
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

        let preparedData = await this.__prepareUpsertData(msgObj);
        let updateResult = await this.__nedbRepository.update(preparedData);

        this.__updateMeta(updateResult, preparedData);

        let transformed = this.__transform(updateResult, preparedData);
        // transformed.response = upsertResult.response;

        return transformed;
    }

    __validate(msgObj) {

        let errMsg = null;

        if (!msgObj.path)
            errMsg = 'No path defined';

        if (msgObj.options && msgObj.options.tag) {
            if (msgObj.data != null) {
                errMsg = errMsg === null ? 'Cannot set tag with new data.' :
                    errMsg += '; Cannot set tag with new data.';
            }
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

        // use a builder...
        let result = await this.__upsertBuilder
            .withPath(path)
            .withData(data)
            .withOptions(options)
            .withFindByPathFunc(this.__nedbRepository.getOneByPath.bind(this.__nedbRepository))
            .build();

        return result;
    }

    __updateMeta(updateResult, preparedParams) {

        if (updateResult.meta)
            updateResult.meta.path = updateResult.meta._id;
        else
            updateResult.meta = this.__getMeta(updateResult.created || preparedParams.setParams.$set);
    }

    __transform(updateResult, updateData) {

        let dataObj = null;

        if (updateResult.created)
            dataObj = updateResult.created;
        else {
            updateData.setData.path = updateData.path;
            dataObj = updateData.setData;
        }

        let transformed = {
            data: dataObj.data
        };

        if (!updateResult.meta) {
            updateResult.meta = {};

            if (dataObj.created) updateResult.meta.created = dataObj.created;

            if (dataObj.modified) updateResult.meta.modified = dataObj.modified;

            if (dataObj.modifiedBy) updateResult.meta.modifiedBy = dataObj.modifiedBy;
        }

        transformed._meta = updateResult.meta;

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
}