const EventEmitter = require('events').EventEmitter;

// For the unititated
// - https://www.cloudamqp.com/blog/2015-05-18-part1-rabbitmq-for-beginners-what-is-rabbitmq.html
// - https://www.rabbitmq.com/getstarted.html

// common Rabbit service used by both fifo and topic queue services
module.exports = class CoreRabbitService {

    constructor(config, logger, amqpClient) {
        this.__config = config;
        this.__logger = logger;
        this.__queue = amqpClient;
        this.__emitter = new EventEmitter();
    }

    static create(config, logger, amqpClient) {
        return new CoreRabbitService(config, logger, amqpClient);
    }

    async initialize() {

        this.__channel = null;
        this.__connection = null;
        this.__reconnect = true;
        this.__stopped = false;
        this.__connected = false;
        this.__retry = 0;

        this.__maxDelay = this.__config.maxReconnectDelay || 120000;
        this.__maxRetry = this.__config.maxReconnectRetries || 20;
        this.__delayAfter = this.__config.reconnectDelayAfter || 1000;

        await this.start();

        this.__logger.info('--> Core RabbitMqService started...');
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

    async start() {
        this.__logger.info('---> RabbitMqService starting....');

        if (await this.__connect())
            await this.__setChannel();

        this.__emitter.emit('serviceStarted', {});
    }

    async __connect() {

        this.__connecting = true;
        let connectionString = this.__createConnectionString();

        try {
            this.__connection = await this.__queue.connect(connectionString);

            this.__connection.on('error', this.__connectionErrorHandler.bind(this));
            this.__connection.on('close', this.__connectionCloseHandler.bind(this));

            this.__connected = true;
            this.__connecting = false;
            this.__stopped = false;

            if (this.__retry !== 0)
                this.__logger.info('--> Reconnected to queue server');

            this.__retry = 0;

            return true;

        } catch (e) {

            this.__logger.error(`--> Error Starting queueService... ${e}`);

            this.__connecting = false;

            if (this.__retry === 0)
                return this.__reconnectToQueue();
            else
                if (await this.__reconnectToQueue())
                    await this.__setChannel();
        }
    }

    async __connectionErrorHandler(error) {

        this.__logger.error(`--> Connection error in queueService... ${error.message}`);

        if (this.__reconnect === true &&
            error.message === 'AMQPConnection closing' &&
            this.__stopped === false) {

            if (await this.__reconnectToQueue())
                await this.__setChannel();

            this.__emitter.emit('connectionError', error);
        }
    }

    async __channelErrorHandler(error) {
        this.__logger.error(`--> Channel error in queueService... ${error.message}`);
        this.__emitter.emit('channelError', error);
    }

    async __connectionCloseHandler() {

        if (this.__reconnect === true && this.__stopped === false) {

            if (await this.__reconnectToQueue())
                await this.__setChannel();

            this.__emitter.emit('connectionClosed', {});
        }
    }

    // a channel is a 'virtual' connection in the main connection
    async __setChannel() {

        if (!this.__connection)
            return;

        this.__logger.info(`--> Setting up channel...`);

        this.__channel = await this.__connection.createChannel();
        this.__channel.on('error', this.__channelErrorHandler.bind(this));

        this.__logger.info('--> Channel successfully set up...');
    }

    getChannel() {
        return this.__channel;
    }

    async __reconnectToQueue() {

        if (this.__connecting)
            return true;

        this.__logger.debug(`--> __reconnectToQueue retry Count ${this.__retry}`);

        if (this.__retry >= this.__maxRetry) {
            await this.stop();
            this.__logger.error(`--> QueueService max retry reached, stop trying to connect... ${this.__maxRetry}`);
            return;
        }

        this.__connected = false;
        this.__connecting = true;
        this.__connection = undefined;

        const range = Math.floor(this.__retry / this.__delayAfter);
        await new Promise((resolve) => setTimeout(resolve, Math.min(range * (Math.pow(range, 1.5)) * 60000, this.__maxDelay) || 1000));

        this.__retry++;
        this.__logger.warn('--> QueueService trying to reconnect');
        return this.__connect();
    }

    async stop() {

        this.__reconnect = false;

        if (!this.__config || this.__stopped)
            return;

        this.__logger.info('--> Stopping queueService...');

        if (this.__channel)
            await this.__channel.close();

        if (this.__connection)
            await this.__connection.close();

        this.__stopped = true;
        this.__connected = false;

        this.__emitter.emit('serviceStopped', {});
    }

    async setHandler(queueName, handler, noAck = false) {

        // handler signature is (channel, queueItem)
        await this.__channel.consume(queueName, handler.bind(null, this.__channel), {
            noAck: noAck
        });
    }

    startQueue(queueName, durable = true) {

        this.__logger.info(`--> asserting queue ${queueName} ...`);

        this.__channel.assertQueue(queueName, {
            durable: durable
        });

        this.__channel.prefetch(1);
    }

    __createConnectionString() {

        let auth = (this.__config.userName && this.__config.password) ?
            `${this.__config.userName}:${this.__config.password}` :
            '';

        if (auth.length > 3)
            return `amqp://${auth}@${this.__config.host}`;
        else
            return `amqp://${this.__config.host}`;
    }
}