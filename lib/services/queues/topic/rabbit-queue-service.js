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
        this.__coreRabbitService.startQueue(queueName);
        return this;
    }

    startExchange(exchangeName) {

        this.__logger.info(`--> Asserting TOPIC exchange ${exchangeName} ...`);

        let channel = this.__coreRabbitService.getChannel();

        channel.assertExchange(exchangeName, 'topic', {
            durable: true
        });

        return this;
    }

    bindQueueToExchange(queueName, exchangeName, routingKey){
        this.__logger.debug(`--> binding queue: ${queueName} to exchange: ${exchangeName} with routing key: ${routingKey}...`);

        const channel = this.__coreRabbitService.getChannel();
        channel.bindQueue(queueName, exchangeName, routingKey);

        return this;
    }

    async subscribe(queueName, handler) {

        this.__logger.debug(`--> subscribing to queue: ${queueName} ...`);

        // const channel = this.__coreRabbitService.getChannel();
        // channel.bindQueue(queueName, exchangeName, routingKey);

        this.__logger.debug(`--> setting handler for queue: ${queueName} ...`);
        await this.__coreRabbitService.setHandler(queueName, handler, true);
        this.__logger.debug(`--> handler set for queue: ${queueName}!`);

        return this;
    }

    publish(exchange, key, item) {
        this.__logger.debug(`--> publishing to exchange: ${exchange}; key: ${key}; item: ${item} ...`);
        let msg = (typeof item !== 'string') ? JSON.stringify(item) : item;
        this.__coreRabbitService.getChannel().publish(exchange, key, Buffer.from(msg));

        return this;
    }

};
