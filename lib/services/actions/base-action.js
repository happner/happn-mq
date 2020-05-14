module.exports = class BaseActionService {

    constructor(config, logger, queueService, utils) {
        this.__config = config;
        this.__logger = logger;
        this.__queueService = queueService;
        this.__utils = utils;
    }

    process(msgObj) {

        // TODO: based on the action, determine whether or not to add this to one or both queues...
        this.__queueService.add('HAPPN_WORKER_OUT', JSON.stringify(msgObj));

        if (!msgObj.request.options.noPublish)
            this.__queueService.add('HAPPN_PUBSUB_OUT', JSON.stringify(msgObj));
    }
}