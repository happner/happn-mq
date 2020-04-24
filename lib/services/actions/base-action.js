module.exports = class BaseActionService {

    constructor(config, logger, queueService) {
        this.__config = config;
        this.__logger = logger;
        this.__queueService = queueService;
    }

    async process(msgObj) {

        // TODO: add logic to add to one or both queues...
        this.__queueService.add('HAPPN_WORKER_OUT', JSON.stringify(msgObj));

        // this.__queueService.add('HAPPN_PUBSUB_OUT', JSON.stringify(msgObj));
    }
}