
module.exports = class ActionServiceFactory {

    constructor(logger, securityService, queueService, dataService) {
        this.__logger = logger;
        this.__securityService = securityService;
        this.__queueService = queueService;
        this.__dataService = dataService;
    }

    static create(logger, securityService, queueService, dataService) {
        return new ActionServiceFactory(logger, securityService, queueService, dataService);
    }

    getActionService(type) {

        try {
            return new (require(`../services/actions/${type}`))(this.__securityService, this.__queueService, this.__dataService);
        } catch (err) {
            this.__logger.error('getActionService', err);
            throw err;
        }
    }
}