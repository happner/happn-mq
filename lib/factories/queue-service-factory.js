
module.exports = class QueueServiceFactory {

    constructor(config, logger, coreRabbitService) {
        this.__config = config;
        this.__logger = logger;
        this.__coreRabbitService = coreRabbitService;
    }

    static create(config, logger, coreRabbitService) {
        return new QueueServiceFactory(config, logger, coreRabbitService);
    }

    getFifoQueueService() {

        // this.__logger.debug(`Getting the queue service - provider type: ${this.__config.queueProvider}`);

        try {
            switch (this.__config.queueProvider) {
                case 'memory':
                    return require('../services/queues/fifo/memory-queue-service').create(this.__config, this.__logger);
                case 'rabbitmq':
                    return require('../services/queues/fifo/rabbit-queue-service').create(this.__config, this.__logger, this.__coreRabbitService);
                default:
                    return null;
            }
        } catch (err) {
            this.__logger.error('getQueueService', err);
            throw err;
        }
    }

    getTopicQueueService() {

    }
}