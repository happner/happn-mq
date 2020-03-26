const expect = require('expect.js');
const Mocker = require('mini-mock');

const QueueService = require('../../lib/services/rabbit-queue-service');

describe('rabbit-queue-service-tests', function () {

    this.timeout(20000);

    before('setup', async () => {

        this.__mocker = new Mocker();

        this.__config = {
            happnMq: {
                queues: [
                    { name: 'HAPPN_PUBSUB_IN', type: 'pubsub_in' },
                    { name: 'HAPPN_PUBSUB_OUT', type: 'pubsub_out' },
                    { name: 'HAPPN_WORKER_IN', type: 'worker_in' },
                    { name: 'HAPPN_WORKER_OUT', type: 'worker_out' }
                ],
                queueProvider: 'rabbitmq',  // to be interchangeable with other implementations
                host: process.env['RABBITMQ_HOST'] || '0.0.0.0',
                userName: process.env['RABBITMQ_USERNAME'],
                password: process.env['RABBITMQ_PASSWORD'],
                maxReconnectDelay: 120000,
                maxReconnectRetries: 4,
                reconnectDelayAfter: 2000
            },
        };

        this.__logger = {
            info: (msg, obj) => { if (!obj) console.info(msg); else console.info(msg, obj); },
            warn: (msg, obj) => { if (!obj) console.warn(msg); else console.warn(msg, obj); },
            debug: (msg, obj) => { if (!obj) console.debug(msg); else console.debug(msg, obj) },
            error: (msg, err) => { if (!err) console.error(msg); else console.error(msg, err) }
        }
    });

    after('stop', async () => {
    });

    it('successfully initializes rabbit queue service', async () => {

        const mockAmqpClient = createMockAmqpClient();

        // system under test
        const queueService = QueueService.create(this.__config.happnMq, this.__logger, mockAmqpClient);
        await queueService.initialize();

        // expectations
        expect(mockAmqpClient.connectCount).to.equal(1);
        expect(mockAmqpClient.createChannelCount).to.equal(1);
    });

    it('successfully starts a queue', async () => {

        const mockAmqpClient = createMockAmqpClient();

        // system under test
        const queueService = QueueService.create(this.__config.happnMq, this.__logger, mockAmqpClient);
        await queueService.initialize();
        await queueService.startQueue('TEST_QUEUE');

        // expectations
        expect(mockAmqpClient.connectCount).to.equal(1);
        expect(mockAmqpClient.createChannelCount).to.equal(1);
        expect(mockAmqpClient.assertQueueCount).to.equal(1);
        expect(mockAmqpClient.prefetchCount).to.equal(1);
    });

    it('successfully reconnects when connection closed', async () => {

        const mockAmqpClient = createMockAmqpClient();

        // system under test
        const queueService = QueueService.create(this.__config.happnMq, this.__logger, mockAmqpClient);
        await queueService.initialize();
        await queueService.startQueue('TEST_QUEUE');

        // directly invoke the connection closed handler
        await queueService.__connectionCloseHandler();

        // expectations
        expect(mockAmqpClient.connectCount).to.equal(2);
        expect(mockAmqpClient.createChannelCount).to.equal(2);
        expect(mockAmqpClient.assertQueueCount).to.equal(1);
        expect(mockAmqpClient.prefetchCount).to.equal(1);
    });

    it('attempts reconnection when a connection error is encountered', async () => {

        const mockAmqpClient = createMockAmqpClient(true);

        // system under test
        const queueService = QueueService.create(this.__config.happnMq, this.__logger, mockAmqpClient);
        await queueService.initialize();

        // expectations - will retry the connection 4 times after initial attempt (ie: 5) - based on config setting
        expect(mockAmqpClient.connectCount).to.equal(5);
        expect(mockAmqpClient.createChannelCount).to.equal(0);
    });

    it('throws error when unable to create a channel', async () => {

        const mockAmqpClient = createMockAmqpClient(false, true);

        // system under test
        const queueService = QueueService.create(this.__config.happnMq, this.__logger, mockAmqpClient);

        try {
            await queueService.initialize();
        } catch (err) {
            expect(mockAmqpClient.connectCount).to.equal(1);
            expect(mockAmqpClient.createChannelCount).to.equal(1);
            expect(err.message.indexOf('Channel error forcibly thrown!') > -1);
        }

    });

    it('stopping service successfully closes channel and connection', async () => {

        const mockAmqpClient = createMockAmqpClient();

        // system under test
        const queueService = QueueService.create(this.__config.happnMq, this.__logger, mockAmqpClient);
        await queueService.initialize();
        await queueService.stop();

        expect(mockAmqpClient.connectCount).to.equal(1);
        expect(mockAmqpClient.createChannelCount).to.equal(1);
        expect(mockAmqpClient.connectionClosedCount).to.equal(1);
        expect(mockAmqpClient.channelClosedCount).to.equal(1);

    });

    /*
     HELPERS
     */
    function createMockAmqpClient(throwsConnectionError, throwsChannelError) {

        const result = {
            connect: async () => {

                result.connectCount += 1;

                if (throwsConnectionError)
                    throw new Error('Connection error forcibly thrown!');

                return {
                    on: () => { },
                    close: () => {
                        result.connectionClosedCount += 1;
                    },
                    createChannel: async () => {
                        result.createChannelCount += 1;

                        if (throwsChannelError)
                            throw new Error('Channel error forcibly thrown!');

                        return {
                            on: (type, func) => { console.log(`Invoking ${type} event handler`); func(arguments) },
                            close: () => {
                                result.channelClosedCount += 1;
                            },
                            assertQueue: () => {
                                result.assertQueueCount += 1;
                            },
                            prefetch: () => {
                                result.prefetchCount += 1;
                            }
                        }
                    }
                }
            },
            connectCount: 0,
            connectionClosedCount: 0,
            createChannelCount: 0,
            channelClosedCount: 0,
            assertQueueCount: 0,
            prefetchCount: 0
        }

        return result;
    }

})

