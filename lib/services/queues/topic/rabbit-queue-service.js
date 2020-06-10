/* Rabbit topic queues:
    - topic exchange -> the main 'router' that messages are sent to/listened on
    - queue binding -> a pattern-based binding between an exchange and a queue
    - routing key -> each message has a routing key which informs the exchange which queue binding to use 

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

        this.__logger.info(`--> Asserting exchange ${exchangeName} ...`);

        let channel = this.__coreRabbitService.getChannel();

        channel.assertExchange(exchangeName, 'topic', {
            durable: false
        });
    }

    subscribe(exchangeName, queueName, routingKey, handler) {

        this.__logger.info(`--> subscribing to exchange: ${exchangeName}; queue: ${queueName} ...`);
        const channel = this.__coreRabbitService.getChannel();
        channel.bindQueue(queueName, exchangeName, routingKey);

        this.__logger.info(`--> setting handler for queue: ${queueName} ...`);
        return this.__coreRabbitService.setHandler(queueName, handler, true);
    }

    // setHandler(queueName, handler) {
    //     this.__logger.info(`--> setting handler for queue: ${queueName} ...`);
    //     return this.__coreRabbitService.setHandler(queueName, handler, true);
    // }

    publish(exchange, key, item) {
        let msg = (typeof item !== 'string') ? JSON.stringify(item) : item;
        this.__coreRabbitService.getChannel().publish(exchange, key, Buffer.from(msg));
    }

};
