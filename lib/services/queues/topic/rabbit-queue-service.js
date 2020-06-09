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

    startExchange(exchangeName) {

        this.__logger.info(`--> Asserting exchange ${exchangeName} ...`);

        this.__coreRabbitService.getChannel().assertExchange(exchangeName, 'topic', {
            durable: this.__config.durable
        });

        this.__coreRabbitService.emit('exchangeStarted', { exchangeName });
    }

    publish(exchange, key, item) {
        let msg = (typeof item !== 'string') ? JSON.stringify(item) : item;
        this.__coreRabbitService.getChannel().publish(exchange, key, Buffer.from(msg));
        this.__coreRabbitService.emit('itemPublished', { key, item });
    }

};
