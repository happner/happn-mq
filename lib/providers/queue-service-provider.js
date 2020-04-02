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
        switch (this.__config.queueProvider) {
            case 'memory':
                return require('../services/memory-queue-service').create(this.__config, this.__logger);
            case 'rabbitmq':
                return require('../services/rabbit-queue-service').create(this.__config, this.__logger, AmqpClient);
            default:
                return null;
        }
    }

}