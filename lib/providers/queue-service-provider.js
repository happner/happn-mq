module.exports = class QueueServiceProvider {

    constructor(config) {
        this.__config = config;
    }

    static create(config) {
        return new QueueServiceProvider(config);
    }

    getQueueService() {
        switch (this.__config.queueProvider) {
            case 'rabbitmq':
                return require('../services/rabbit-queue-service').create(this.__config);
            default:
                return null;
        }
    }

}