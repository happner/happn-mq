module.exports = class BaseActionService {

    constructor(config, logger, fifoQueueService, topicQueueService, utils) {
        this.__config = config;
        this.__logger = logger;
        this.__fifoQueueService = fifoQueueService;
        this.__topicQueueService = topicQueueService;
        this.__utils = utils;
    }

    process(msgObj) {

        this.__fifoQueueService.add('HAPPN_WORKER_OUT', msgObj);

        if (msgObj.request.options && !msgObj.request.options.noPublish) {
            this.__topicQueueService.publish('HAPPN-MQ-CORE', msgObj.request.path, JSON.stringify(msgObj));
        }

    }
}