/* Rabbit broadcast queues:
    - exchange -> the main 'router' that messages are sent to/listened on
    - queue binding -> a binding between an exchange and a queue
    - * no routing key is used on the binding as the message will be published on ALL bound queues

*/

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

    startExchange(exchangeName) {

        this.__logger.info(`--> Asserting FANOUT exchange ${exchangeName} ...`);

        let channel = this.__coreRabbitService.getChannel();

        channel.assertExchange(exchangeName, 'fanout', {
            durable: true
        });
    }

    // NOTE: a handler is bound to a QUEUE. 
    async subscribe(exchangeName, queueName, handler) {

        this.__logger.debug(`--> subscribing to exchange: ${exchangeName}; queue: ${queueName} ...`);

        const channel = this.__coreRabbitService.getChannel();
        channel.bindQueue(queueName, exchangeName);

        this.__logger.debug(`--> setting handler for queue: ${queueName} ...`);
        await this.__coreRabbitService.setHandler(queueName, handler, true);
        this.__logger.debug(`--> handler set for queue: ${queueName}!`);

        return this;
    }

    publish(exchange, key, item) {
        this.__logger.debug(`--> publishing to exchange: ${exchange}; key: ${key}; item: ${item} ...`);
        let msg = (typeof item !== 'string') ? JSON.stringify(item) : item;
        this.__coreRabbitService.getChannel().publish(exchange, key, Buffer.from(msg));
    }

};
