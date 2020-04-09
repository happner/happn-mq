module.exports = class BaseActionService {

    constructor(config, logger, queueService) {
        this.__config = config;
        this.__logger = logger;
        this.__queueService = queueService;
    }

    async process(msgObj) {
        this.__queueService.add('HAPPN_WORKER_OUT', JSON.stringify(msgObj));
    }
}