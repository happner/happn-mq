const AmqpClient = require('amqplib');

module.exports = class QueueServiceProvider {

    constructor(config, logger) {
        this.__config = config;
        this.__logger = logger;
    }

    static create(config, logger) {
        return new QueueServiceProvider(config, logger);
    }

    getQueueService() {

        this.__logger.debug(`Getting the queue service - provider type: ${this.__config.queueProvider}`);

        try {
            switch (this.__config.queueProvider) {
                case 'memory':
                    return require('../services/memory-queue-service').create(this.__config, this.__logger);
                case 'rabbitmq':
                    return require('../services/rabbit-queue-service').create(this.__config, this.__logger, AmqpClient);
                default:
                    return null;
            }
        } catch (err) {
            this.__logger.error('getQueueService', err);
            throw err;
        }
    }
}