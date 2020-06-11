/* Rabbit topic queues:
    - topic exchange -> the main 'router' that messages are sent to/listened on
    - queue binding -> a pattern-based binding between an exchange and a queue
    - routing key -> each message has a routing key which informs the exchange which queue binding to use 

*/

const EventEmitter = require('events').EventEmitter;

module.exports = class RabbitQueueService {

    constructor(config, logger, coreRabbitService) {
        this.__config = config;
        this.__logger = logger;
        this.__coreRabbitService = coreRabbitService;
        this.__emitter = new EventEmitter();
    }

    emit(eventType, eventObj) {
        this.__emitter.emit(eventType, eventObj);
    }

    on(eventType, handler) {
        return this.__emitter.on(eventType, handler);
    }

    removeListener(eventType, handler) {
        return this.__emitter.removeListener(eventType, handler);
    }

    removeAllListeners(eventType) {
        return this.__emitter.removeAllListeners(eventType);
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
            durable: true
        });
    }

    // NOTE: a handler is bound to a QUEUE. 
    async subscribe(exchangeName, queueName, routingKey, handler) {

        this.__logger.debug(`--> subscribing to exchange: ${exchangeName}; queue: ${queueName} ...`);

        const channel = this.__coreRabbitService.getChannel();
        await channel.bindQueue(queueName, exchangeName, routingKey);

        this.__logger.debug(`--> setting handler for queue: ${queueName} ...`);
        this.__coreRabbitService.setHandler(queueName, handler, true);
    }

    publish(exchange, key, item) {
        this.__logger.debug(`--> publishing to exchange: ${exchange}; key: ${key}; item: ${item} ...`);
        let msg = (typeof item !== 'string') ? JSON.stringify(item) : item;
        this.__coreRabbitService.getChannel().publish(exchange, key, Buffer.from(msg));

        this.emit('itemPublished', {});
    }

};
