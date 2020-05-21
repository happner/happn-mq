
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
        return this.__actions[`${type}Action`];
    }
}