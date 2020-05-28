const expect = require('expect.js');
const Mocker = require('mini-mock');

// const QueueService = require('../../../../lib/services/queues/fifo/rabbit-queue-service');
const QueueService = require('../../../lib/services/queues/fifo/rabbit-queue-service');

describe('rabbit-queue-service-tests', function () {

    this.timeout(20000);

    before('setup', async () => {

        this.__mocker = new Mocker();

        // this.__config = {
        //     happnMq: {
        //         queues: [
        //             { name: 'HAPPN_PUBSUB_IN', type: 'pubsub_in' },
        //             { name: 'HAPPN_PUBSUB_OUT', type: 'pubsub_out' },
        //             { name: 'HAPPN_WORKER_IN', type: 'worker_in' },
        //             { name: 'HAPPN_WORKER_OUT', type: 'worker_out' }
        //         ],
        //         queueProvider: 'rabbitmq',  // to be interchangeable with other implementations
        //         host: process.env['RABBITMQ_HOST'] || '0.0.0.0',
        //         userName: process.env['RABBITMQ_USERNAME'],
        //         password: process.env['RABBITMQ_PASSWORD'],
        //         maxReconnectDelay: 10000,
        //         maxReconnectRetries: 4,
        //         reconnectDelayAfter: 1000
        //     },
        // };

        this.__logger = {
            info: (msg, obj) => { if (!obj) console.info(msg); else console.info(msg, obj); },
            warn: (msg, obj) => { if (!obj) console.warn(msg); else console.warn(msg, obj); },
            debug: (msg, obj) => { if (!obj) console.debug(msg); else console.debug(msg, obj) },
            error: (msg, err) => { if (!err) console.error(msg); else console.error(msg, err) }
        }
    });

    after('stop', async () => {
    });

    it('successfully initializes rabbit queue service', () => {

        return new Promise((resolve, reject) => {

            // mock rabbit client
            const mockAmqpClient = createMockAmqpClient();

            // system under test
            const queueService = QueueService.create({ userName: 'test', password: 'test' }, this.__logger, mockAmqpClient);

            let startedHandler = () => {

                // expectations
                expect(mockAmqpClient.counter.connectionErrorEventCount).to.equal(0);   // no error events
                expect(mockAmqpClient.counter.connectCount).to.equal(1);
                expect(mockAmqpClient.counter.channelErrorEventCount).to.equal(0);  // no error events
                expect(mockAmqpClient.counter.createChannelCount).to.equal(1);

                queueService.stop();

                resolve();
            }

            let setup = async () => {
                queueService.on('serviceStarted', startedHandler);
                await queueService.initialize();
            }

            setup()
                .catch(err => {
                    return reject(err);
                });
        });
    });

    it('successfully starts a queue', () => {

        return new Promise((resolve, reject) => {

            // mock rabbit client
            const mockAmqpClient = createMockAmqpClient();

            // system under test
            const queueService = QueueService.create({}, this.__logger, mockAmqpClient);

            let startedHandler = () => {

                // expectations
                expect(mockAmqpClient.counter.connectCount).to.equal(1);
                expect(mockAmqpClient.counter.createChannelCount).to.equal(1);
                expect(mockAmqpClient.counter.channelAssertQueueCount).to.equal(1);
                expect(mockAmqpClient.counter.channelPrefetchCount).to.equal(1);

                queueService.stop();

                resolve();
            }

            let setup = async () => {
                queueService.on('queueStarted', startedHandler);
                await queueService.initialize();
                await queueService.startQueue('TEST_QUEUE');
            }

            setup()
                .catch(err => {
                    return reject(err);
                });
        });
    });

    it('successfully sets a queue handler', async () => {

        // mock rabbit client
        const mockAmqpClient = createMockAmqpClient();

        // system under test
        const queueService = QueueService.create({}, this.__logger, mockAmqpClient);

        await queueService.initialize();
        await queueService.startQueue('TEST_QUEUE');
        queueService.setHandler('TEST_QUEUE', () => { });

        expect(mockAmqpClient.counter.channelConsumeCount).to.equal(1);
    });


    it('successfully reconnects when connection closed event raised', () => {

        return new Promise((resolve, reject) => {

            // mock rabbit client
            const mockAmqpClient = createMockAmqpClient();

            // system under test
            const queueService = QueueService.create({}, this.__logger, mockAmqpClient);

            let closedHandler = () => {

                expect(mockAmqpClient.counter.connectCount).to.equal(2);    // initial connection + reconnect
                expect(mockAmqpClient.counter.connectionCloseEventCount).to.equal(1);   // single closed event
                expect(mockAmqpClient.counter.createChannelCount).to.equal(2);  // initial channel creation + recreate
                expect(mockAmqpClient.counter.channelAssertQueueCount).to.equal(1);
                expect(mockAmqpClient.counter.channelPrefetchCount).to.equal(1);

                queueService.stop();

                resolve();
            }

            let setup = async () => {

                queueService.on('connectionClosed', closedHandler);
                await queueService.initialize();
                await queueService.startQueue('TEST_QUEUE');

                // raise a closed event on the mock rabbit connection
                mockAmqpClient.connection.raiseEvent('close');
            }

            setup()
                .catch(err => {
                    return reject(err);
                });
        });

    });

    it('processes a single reconnection at a time', () => {

        return new Promise((resolve, reject) => {

            let closedCount = 0;

            // mock rabbit client
            const mockAmqpClient = createMockAmqpClient();

            // system under test
            const queueService = QueueService.create({}, this.__logger, mockAmqpClient);

            let closedHandler = () => {

                closedCount++;

                if (closedCount === 2) {
                    // expectations
                    expect(mockAmqpClient.counter.connectCount).to.equal(2);
                    expect(mockAmqpClient.counter.createChannelCount).to.equal(2);
                    expect(mockAmqpClient.counter.channelAssertQueueCount).to.equal(1);
                    expect(mockAmqpClient.counter.channelPrefetchCount).to.equal(1);

                    queueService.stop();

                    resolve();
                }
            }

            let setup = async () => {
                queueService.on('connectionClosed', closedHandler);
                await queueService.initialize();
                await queueService.startQueue('TEST_QUEUE');

                // raise 2 closed events on the mock rabbit connection
                mockAmqpClient.connection.raiseEvent('close');
                mockAmqpClient.connection.raiseEvent('close');
            }

            setup()
                .catch(err => {
                    return reject(err);
                });
        });

    });

    it('reconnects when a connection error event is raised', () => {

        return new Promise((resolve, reject) => {

            // mock rabbit client
            const mockAmqpClient = createMockAmqpClient();

            // system under test
            const queueService = QueueService.create({}, this.__logger, mockAmqpClient);

            let errorHandler = () => {

                // expectations
                expect(mockAmqpClient.counter.connectionErrorEventCount).to.equal(1);
                expect(mockAmqpClient.counter.connectCount).to.equal(2);
                expect(mockAmqpClient.counter.channelErrorEventCount).to.equal(0);
                expect(mockAmqpClient.counter.createChannelCount).to.equal(2);

                queueService.stop();

                resolve();
            }

            let setup = async () => {
                queueService.on('connectionError', errorHandler);
                await queueService.initialize();

                // raise a connection closed event
                mockAmqpClient.connection.raiseEvent('error', new Error('AMQPConnection closing'));
            }

            setup()
                .catch(err => {
                    return reject(err);
                });
        });
    });

    it('channel error logged', () => {

        return new Promise((resolve, reject) => {

            // mock rabbit client
            const mockAmqpClient = createMockAmqpClient();

            // system under test
            const queueService = QueueService.create({}, this.__logger, mockAmqpClient);

            let errorHandler = () => {

                // expectations
                expect(mockAmqpClient.counter.connectionErrorEventCount).to.equal(0);
                expect(mockAmqpClient.counter.connectCount).to.equal(1);
                expect(mockAmqpClient.counter.channelErrorEventCount).to.equal(1);
                expect(mockAmqpClient.counter.createChannelCount).to.equal(1);

                queueService.stop();

                resolve();
            }

            let setup = async () => {
                queueService.on('channelError', errorHandler);
                await queueService.initialize();

                // raise a channel error event
                mockAmqpClient.channel.raiseEvent('error', new Error('Forced channel error!'));
            }

            setup()
                .catch(err => {
                    return reject(err);
                });

        });
    });

    it('stopping service successfully closes channel and connection', async () => {

        const mockAmqpClient = createMockAmqpClient();

        // system under test
        const queueService = QueueService.create({}, this.__logger, mockAmqpClient);
        await queueService.initialize();
        await queueService.stop();

        expect(mockAmqpClient.counter.connectCount).to.equal(1);
        expect(mockAmqpClient.counter.createChannelCount).to.equal(1);
        expect(mockAmqpClient.counter.connectionClosedCount).to.equal(1);
        expect(mockAmqpClient.counter.channelClosedCount).to.equal(1);

    });

    // it('connection error is handled by event handler', async () => {

    //     const mockAmqpClient = createMockAmqpClient();

    //     // system under test
    //     const queueService = QueueService.create({}, this.__logger, mockAmqpClient);
    //     await queueService.initialize();
    //     // await queueService.stop();

    //     mockAmqpClient.connection.raiseEvent('error', new Error('Forced error event!'));
    //     // expect(mockAmqpClient.connectCount).to.equal(1);
    //     // expect(mockAmqpClient.createChannelCount).to.equal(1);
    //     // expect(mockAmqpClient.connectionClosedCount).to.equal(1);
    //     // expect(mockAmqpClient.channelClosedCount).to.equal(1);

    // });

    it('successfully adds an item to the queue', () => {

        return new Promise((resolve, reject) => {

            // mock rabbit client
            const mockAmqpClient = createMockAmqpClient();

            // system under test
            const queueService = QueueService.create({}, this.__logger, mockAmqpClient);

            let itemAddedHandler = () => {

                // expectations
                expect(mockAmqpClient.counter.connectCount).to.equal(1);
                expect(mockAmqpClient.counter.createChannelCount).to.equal(1);
                expect(mockAmqpClient.counter.channelAssertQueueCount).to.equal(1);
                expect(mockAmqpClient.counter.channelPrefetchCount).to.equal(1);
                expect(mockAmqpClient.counter.channelSendToQueueCount).to.equal(1);

                queueService.stop();

                resolve();
            }

            let setup = async () => {
                queueService.on('itemAdded', itemAddedHandler);
                await queueService.initialize();
                await queueService.startQueue('TEST_QUEUE');
                queueService.add('TEST_QUEUE', { testId: '1' });
            }

            setup()
                .catch(err => {
                    return reject(err);
                });
        });

    });

    it('successfully attempts to reconnect when queue connection is caught', () => {

        return new Promise((resolve, reject) => {

            // mock rabbit client
            const mockAmqpClient = createMockAmqpClient();

            // force a connection error to be thrown by the mock
            mockAmqpClient.connect = () => {
                mockAmqpClient.counter.connectCount += 1;
                throw new Error('Forced connect error!')
            };

            let config = {
                maxReconnectDelay: 10000,
                maxReconnectRetries: 4,
                reconnectDelayAfter: 1000
            };

            // system under test
            const queueService = QueueService.create(config, this.__logger, mockAmqpClient);

            let serviceStoppedHandler = () => {

                // expectations
                expect(mockAmqpClient.counter.connectCount).to.equal(5);

                queueService.stop();
                resolve();
            }

            let setup = async () => {
                queueService.on('serviceStopped', serviceStoppedHandler);
                await queueService.initialize();
                await queueService.startQueue('TEST_QUEUE');
            }

            setup()
                .catch(err => {
                    return reject(err);
                });
        });

    });

    it('does not attempt to stop again when stop already called', () => {

        return new Promise((resolve, reject) => {

            // mock rabbit client
            const mockAmqpClient = createMockAmqpClient();

            // system under test
            const queueService = QueueService.create({}, this.__logger, mockAmqpClient);

            let serviceStoppedHandler = () => {

                // expectations
                expect(mockAmqpClient.counter.connectCount).to.equal(1);
                expect(mockAmqpClient.counter.createChannelCount).to.equal(1);
                expect(mockAmqpClient.counter.channelAssertQueueCount).to.equal(1);
                expect(mockAmqpClient.counter.channelPrefetchCount).to.equal(1);
                expect(mockAmqpClient.counter.channelClosedCount).to.equal(1);
                expect(mockAmqpClient.counter.connectionClosedCount).to.equal(1);

                resolve();
            }

            let setup = async () => {
                queueService.on('serviceStopped', serviceStoppedHandler);
                await queueService.initialize();
                await queueService.startQueue('TEST_QUEUE');
                queueService.stop();
            }

            setup()
                .catch(err => {
                    return reject(err);
                });
        });

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
            channelAssertQueueCount: 0,
            channelPrefetchCount: 0,
            channelSendToQueueCount: 0,
            channelConsumeCount: 0
        }

        let channel = {
            eventEmitter: channelEmitter,
            raiseEvent: (type, msg) => {
                if (type === 'error')
                    counter.channelErrorEventCount += 1;

                if (type === 'close')
                    counter.channelCloseEventCount += 1;

                channel.eventEmitter.emit(type, msg);
            },
            on: (type, func) => {
                channel.eventEmitter.on(type, func);
            },
            close: () => {
                counter.channelClosedCount += 1;
            },
            assertQueue: () => {
                counter.channelAssertQueueCount += 1;
            },
            prefetch: () => {
                counter.channelPrefetchCount += 1;
            },
            sendToQueue: () => {
                counter.channelSendToQueueCount += 1;
            },
            consume: () => {
                counter.channelConsumeCount += 1;
            }
        };

        let connection = {
            eventEmitter: connectionEmitter,
            raiseEvent: (type, msg) => {
                if (type === 'error')
                    counter.connectionErrorEventCount += 1;

                if (type === 'close')
                    counter.connectionCloseEventCount += 1;

                connection.eventEmitter.emit(type, msg);
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

