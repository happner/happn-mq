
module.exports = class DataServiceProvider {

    constructor(config, logger, nedb, utils) {
        this.__config = config;
        this.__logger = logger;
        this.__nedb = nedb;
        this.__utils = utils;
    }

    static create(config, logger, nedb, utils) {
        return new DataServiceProvider(config, logger, nedb, utils);
    }

    getDataService() {

        this.__logger.debug(`Getting the data service - provider type: ${this.__config.data.provider}`);

        try {
            switch (this.__config.data.provider) {
                case 'nedb':
                    return require('../services/nedb-data-service').create(this.__config, this.__logger, this.__nedb, this.__utils);
                default:
                    return null;
            }
        } catch (err) {
            this.__logger.error('getDataService', err);
            throw err;
        }
    }
}