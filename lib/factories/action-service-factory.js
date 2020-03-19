
module.exports = class ActionServiceFactory {

    constructor(securityService, queueService, dataService) {
        this.__securityService = securityService;
        this.__queueService = queueService;
        this.__dataService = dataService;
    }

    static create(securityService, queueService, dataService) {
        return new ActionServiceFactory(securityService, queueService, dataService);
    }

    getActionService(type) {
        return new (require(`../services/actions/${type}`))(this.__securityService, this.__queueService, this.__dataService);
    }
}