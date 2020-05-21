module.exports = class BaseActionService {

    constructor(config, logger, queueService, utils) {
        this.__config = config;
        this.__logger = logger;
        this.__queueService = queueService;
        this.__utils = utils;
    }

    process(msgObj) {

        this.__queueService.add('HAPPN_WORKER_OUT', msgObj);

        if (msgObj.request.options && !msgObj.request.options.noPublish)
            this.__queueService.add('HAPPN_PUBSUB_OUT', msgObj);
    }
}