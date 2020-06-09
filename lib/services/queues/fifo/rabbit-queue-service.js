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

        this.__logger.info(`--> asserting queue ${queueName} ...`);

        const channel = this.__coreRabbitService.getChannel();

        channel.assertQueue(queueName, {
            durable: this.__config.durable
        });

        channel.prefetch(1);
    }

    setHandler(queueName, handler) {
        return this.__coreRabbitService.setHandler(queueName, handler);
    }

    add(queueName, item) {
        let msg = (typeof item !== 'string') ? JSON.stringify(item) : item;
        this.__coreRabbitService.getChannel().sendToQueue(queueName, Buffer.from(msg));
    }

};
