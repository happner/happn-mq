
module.exports = class DataServiceProvider {

    constructor(config, logger, nedbDataService, utils) {
        this.__config = config;
        this.__logger = logger;
        this.__nedbDataService = nedbDataService;
        this.__utils = utils;
    }

    static create(config, logger, nedbDataService, utils) {
        return new DataServiceProvider(config, logger, nedbDataService, utils);
    }

    getDataService() {

        // this.__logger.debug(`Getting the data service - provider type: ${this.__config.data.provider}`);

        try {
            switch (this.__config.data.provider) {
                case 'nedb':
                    return this.__nedbDataService;
                default:
                    return null;
            }
        } catch (err) {
            this.__logger.error('getDataService', err);
            throw err;
        }
    }
}