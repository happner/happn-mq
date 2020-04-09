
module.exports = class ActionServiceFactory {

    constructor(config, logger, actions) {
        this.__config = config;
        this.__logger = logger;
        this.__actions = actions;
    }

    static create(config, logger, actions) {
        return new ActionServiceFactory(config, logger, actions);
    }

    getActionService(type) {

        try {
            // return new (require(`../services/actions/${type}`))(this.__config, this.__logger, this.__securityService, this.__queueService, this.__dataService);

            switch (type) {
                case 'describe':
                    return this.__actions.describeAction;
                case 'get':
                    return this.__actions.getAction;
                case 'login':
                    return this.__actions.loginAction;
                case 'off':
                    return this.__actions.offAction;
                case 'on':
                    return this.__actions.onAction;
                case 'remove':
                    return this.__actions.removeAction;
                case 'set':
                    return this.__actions.setAction;
                default:
                    return null;
            }
        } catch (err) {
            this.__logger.error('getActionService', err);
            throw err;
        }
    }
}