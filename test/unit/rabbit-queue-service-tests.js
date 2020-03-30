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
                maxReconnectDelay: 10000,
                maxReconnectRetries: 4,
                reconnectDelayAfter: 1000
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

        let wait = () => {
            return new Promise((resolve, reject) => {
                // wait 1s for event propagation
                setTimeout(async () => {

                    // expectations
                    expect(mockAmqpClient.counter.connectionErrorEventCount).to.equal(0);   // no error events
                    expect(mockAmqpClient.counter.connectCount).to.equal(1);
                    expect(mockAmqpClient.counter.channelErrorEventCount).to.equal(0);  // no error events
                    expect(mockAmqpClient.counter.createChannelCount).to.equal(1);

                    resolve();
                }, 1000);
            })
        }

        await wait();
    });

    it('successfully starts a queue', async () => {

        const mockAmqpClient = createMockAmqpClient();

        // system under test
        const queueService = QueueService.create(this.__config.happnMq, this.__logger, mockAmqpClient);
        await queueService.initialize();
        await queueService.startQueue('TEST_QUEUE');

        let wait = () => {
            return new Promise((resolve, reject) => {
                // wait 1s for event propagation
                setTimeout(async () => {

                    // expectations
                    expect(mockAmqpClient.counter.connectCount).to.equal(1);
                    expect(mockAmqpClient.counter.createChannelCount).to.equal(1);
                    expect(mockAmqpClient.counter.assertQueueCount).to.equal(1);
                    expect(mockAmqpClient.counter.prefetchCount).to.equal(1);

                    resolve();
                }, 1000);
            })
        }

        await wait();
    });

    it('successfully reconnects when connection closed event raised', async () => {

        const mockAmqpClient = createMockAmqpClient();

        // system under test
        const queueService = QueueService.create(this.__config.happnMq, this.__logger, mockAmqpClient);
        await queueService.initialize();
        await queueService.startQueue('TEST_QUEUE');

        // raise a closed event on the mock rabbit connection
        mockAmqpClient.connection.raiseEvent('close');

        let wait = () => {
            return new Promise((resolve, reject) => {
                // wait 1s for event propagation
                setTimeout(async () => {
                    // expectations
                    expect(mockAmqpClient.counter.connectCount).to.equal(2);    // initial connection + reconnect
                    expect(mockAmqpClient.counter.connectionCloseEventCount).to.equal(1);   // single closed event
                    expect(mockAmqpClient.counter.createChannelCount).to.equal(2);  // initial channel creation + recreate
                    expect(mockAmqpClient.counter.assertQueueCount).to.equal(1);
                    expect(mockAmqpClient.counter.prefetchCount).to.equal(1);

                    resolve();
                }, 2000);
            })
        }

        await wait();

    });

    it('reconnects when a connection error event is raised', async () => {

        const mockAmqpClient = createMockAmqpClient();

        // system under test
        const queueService = QueueService.create(this.__config.happnMq, this.__logger, mockAmqpClient);
        await queueService.initialize();

        // raise a connection closed event
        mockAmqpClient.connection.raiseEvent('error', new Error('AMQPConnection closing'));

        let wait = () => {
            return new Promise((resolve, reject) => {
                // wait 2s for event propagation
                setTimeout(async () => {
                    // expectations
                    expect(mockAmqpClient.counter.connectionErrorEventCount).to.equal(1);
                    expect(mockAmqpClient.counter.connectCount).to.equal(2);
                    expect(mockAmqpClient.counter.channelErrorEventCount).to.equal(0);
                    expect(mockAmqpClient.counter.createChannelCount).to.equal(2);

                    resolve();
                }, 2000);
            })
        }

        await wait();
    });

    it('channel error logged', async () => {

        const mockAmqpClient = createMockAmqpClient();

        // system under test
        const queueService = QueueService.create(this.__config.happnMq, this.__logger, mockAmqpClient);
        await queueService.initialize();

        // raise a channel error event
        mockAmqpClient.channel.raiseEvent('error', new Error('Forced channel error!'));

        let wait = () => {
            return new Promise((resolve, reject) => {
                // wait 2s for event propagation
                setTimeout(async () => {
                    // expectations
                    expect(mockAmqpClient.counter.connectionErrorEventCount).to.equal(0);
                    expect(mockAmqpClient.counter.connectCount).to.equal(1);
                    expect(mockAmqpClient.counter.channelErrorEventCount).to.equal(1);
                    expect(mockAmqpClient.counter.createChannelCount).to.equal(1);

                    resolve();
                }, 2000);
            })
        }

        await wait();

    });

    it('stopping service successfully closes channel and connection', async () => {

        const mockAmqpClient = createMockAmqpClient();

        // system under test
        const queueService = QueueService.create(this.__config.happnMq, this.__logger, mockAmqpClient);
        await queueService.initialize();
        await queueService.stop();

        expect(mockAmqpClient.counter.connectCount).to.equal(1);
        expect(mockAmqpClient.counter.createChannelCount).to.equal(1);
        expect(mockAmqpClient.counter.connectionClosedCount).to.equal(1);
        expect(mockAmqpClient.counter.channelClosedCount).to.equal(1);

    });

    it('connection error is handled by event handler', async () => {

        const mockAmqpClient = createMockAmqpClient();

        // system under test
        const queueService = QueueService.create(this.__config.happnMq, this.__logger, mockAmqpClient);
        await queueService.initialize();
        // await queueService.stop();

        mockAmqpClient.connection.raiseEvent('error', new Error('Forced error event!'));
        // expect(mockAmqpClient.connectCount).to.equal(1);
        // expect(mockAmqpClient.createChannelCount).to.equal(1);
        // expect(mockAmqpClient.connectionClosedCount).to.equal(1);
        // expect(mockAmqpClient.channelClosedCount).to.equal(1);

    });

    /*
     HELPERS
     */
    function createMockAmqpClient() {

        const Events = require('events');

        let connectionEmitter = new Events.EventEmitter();
        let channelEmitter = new Events.EventEmitter();

        let counter = {
            connectCount: 0,
            connectionClosedCount: 0,
            connectionCloseEventCount: 0,
            connectionErrorEventCount: 0,
            createChannelCount: 0,
            channelClosedCount: 0,
            channelCloseEventCount: 0,
            channelErrorEventCount: 0,
            assertQueueCount: 0,
            prefetchCount: 0
        }

        let channel = {
            eventEmitter: channelEmitter,
            raiseEvent: (type, msg) => {
                channel.eventEmitter.emit(type, msg);

                if (type == 'error')
                    counter.channelErrorEventCount += 1;

                if (type == 'close')
                    counter.channelCloseEventCount += 1;
            },
            on: (type, func) => {
                channel.eventEmitter.on(type, func);
            },
            close: () => {
                counter.channelClosedCount += 1;
            },
            assertQueue: () => {
                counter.assertQueueCount += 1;
            },
            prefetch: () => {
                counter.prefetchCount += 1;
            }
        };

        let connection = {
            eventEmitter: connectionEmitter,
            raiseEvent: (type, msg) => {
                connection.eventEmitter.emit(type, msg);

                if (type == 'error')
                    counter.connectionErrorEventCount += 1;

                if (type == 'close')
                    counter.connectionCloseEventCount += 1;
            },
            on: (type, func) => {
                connection.eventEmitter.on(type, func);
            },
            close: () => {
                counter.connectionClosedCount += 1;
            },
            createChannel: async () => {
                counter.createChannelCount += 1;
                return channel;
            }
        };

        const result = {
            connect: async () => {
                counter.connectCount += 1;
                return connection;
            },
            counter: counter,
            connection: connection,
            channel: channel
        }

        return result;
    }

})

