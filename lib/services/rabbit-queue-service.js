const Queue = require('amqplib');

module.exports = class RabbitQueueService {

    constructor(config, logger) {

        this.__config = config;

        if (!logger) {
            this.__logger = {
                info: (msg) => { console.log(msg) },
                error: (msg) => { console.error(msg) },
                debug: (msg) => { console.debug(msg) }
            };
        } else
            this.__logger = logger;

        this.__queue = Queue;
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
        this.__delayAfter = this.__config.reconnectDelayAfter || 10;

        try {
            await this.start();
            this.__logger.info('--> RabbitMqService started...');
        } catch (err) {
            console.log(err);
            this.__logger.error(err);
            throw err;
        }
    }

    static create(config) {
        return new RabbitQueueService(config);
    }

    async start() {
        this.__logger.info('---> RabbitMqService starting....');

        if (await this.__connect())
            await this.__setChannel();
    }

    async __connect() {

        if (this.__connected)
            return true;

        this.__connecting = true;
        let connectionString = this.__createConnectionString();

        try {
            let connectionResult = await this.__queue.connect(connectionString);
            this.__connection = connectionResult;

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
                if (await this.__reconnectToQueue()) await this.__setChannel();
        };
    }

    async __connectionErrorHandler() {

        this.__logger.error(`--> Error in queueService... ${error.message}`);

        if (this.__reconnect === true &&
            this.message === 'AMQPConnection closing' &&
            this.__stopped === false) {

            if (await this.__reconnectToQueue())
                await this.__setChannel();
        }
    }

    async __connectionCloseHandler() {

        if (this.__reconnect === true && this.__stopped === false) {
            try {
                if (await this.__reconnectToQueue())
                    await this.__setChannel();
            } catch (e) {
                this.__logger.error(`--> Error reconnecting to queueService... ${e}`);
            }
        }
    }

    async __setChannel() {
        try {
            if (!this.__connection)
                return;

            this.__logger.info(`--> Setting up channel...`);

            this.__channel = await this.__connection.createChannel();

            this.__channel.on('error', (error) => {
                this.__logger.error(`--> Error in channel... ${error.message}`);
            });

            this.__logger.info('--> Channel successfully set up...');

        } catch (err) {
            throw new Error(`--> Couldn't create a channel : ${err.message}`);
        }
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
        if (!this.__config.queue || this.__stopped) return;
        this.__logger.info('--> Stopping queueService...');

        if (this.__channel) await this.__channel.close();
        if (this.__connection) await this.__connection.close();
        this.__stopped = true;
        this.__connected = false;
    }

    async startQueue(queueName) {

        if (!this.__queue) return;

        this.__logger.info('--> Asserting queue ' + queueName + '...');

        try {
            this.__channel.assertQueue(queueName, {
                durable: this.__config.durable
            });

            this.__channel.prefetch(1);
        } catch (e) {
            this.__logger.error(e);
            throw e;
        }
    }

    async add(queueName, item) {
        try {
            this.__channel.sendToQueue(queueName, Buffer.from(item));
        } catch (err) {
            this.__logger.error('queued message failed ' + queueName + ': ' + err.message);
            throw err;
        }
    }

    async setHandler(queueName, handler) {

        this.__logger.debug('Setting handler for queue ' + queueName);

        try {
            this.__channel.consume(queueName, handler.bind(null, this.__channel), {
                noAck: false
            })
        } catch (err) {
            this.__logger.error(err);
            throw err;
        }
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

};
