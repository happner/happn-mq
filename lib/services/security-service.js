module.exports = class SecurityService {

    constructor(config, logger) {
        this.__config = config;
        this.__logger = logger;
    }

    static create(config, logger) {
        return new SecurityService(config, logger);
    }

    async processAuthorize(msgObj) {

        this.__logger.debug('AUTHORIZING....');

        msgObj.request['action'] = msgObj.raw.action;
        msgObj.request['path'] = msgObj.raw.path;
        msgObj.request['options'] = msgObj.raw.options;

        // this.__logger.debug('AUTHORIZATION RESULT: ', msgObj);
        this.__logger.debug('AUTHORIZED!');

        return msgObj;
    }

    async processLogin(msgObj) {

        this.__logger.debug('LOGGING IN....');

        // TODO: authentication logic
        return true;
    }
}