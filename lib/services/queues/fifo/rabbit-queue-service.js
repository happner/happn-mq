module.exports = class RabbitQueueService {

    constructor(config, logger, coreRabbitService) {
        this.__config = config;
        this.__logger = logger;
        this.__coreRabbitService = coreRabbitService;
    }

    static create(config, logger, coreRabbitService) {
        return new RabbitQueueService(config, logger, coreRabbitService)
    }

    startQueue(queueName) {
        return this.__coreRabbitService.startQueue(queueName);
    }

    setHandler(queueName, handler) {
        return this.__coreRabbitService.setHandler(queueName, handler);
    }

    add(queueName, item) {
        let msg = (typeof item !== 'string') ? JSON.stringify(item) : item;
        this.__coreRabbitService.getChannel().sendToQueue(queueName, Buffer.from(msg));
    }

};
