const expect = require('expect.js');
const Mocker = require('mini-mock');

const CoreRabbitService = require('../../../lib/services/queues/core-rabbit-service');

describe('core-rabbit-service-tests', function () {

    this.timeout(20000);

    before('setup', async () => {

        this.__mocker = new Mocker();

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

        // mock rabbit client
        const mockAmqpClient = createMockAmqpClient();
        const config = { userName: 'test', password: 'test' };

        // system under test
        const coreRabbitService = CoreRabbitService.create(config, this.__logger, mockAmqpClient);
        await coreRabbitService.initialize();

        // expectations
        expect(mockAmqpClient.counter.connectionErrorEventCount).to.equal(0);   // no error events
        expect(mockAmqpClient.counter.connectCount).to.equal(1);
        expect(mockAmqpClient.counter.channelErrorEventCount).to.equal(0);  // no error events
        expect(mockAmqpClient.counter.createChannelCount).to.equal(1);

        coreRabbitService.stop();
    });

    it('successfully starts a queue', async () => {

        // mock rabbit client
        const mockAmqpClient = createMockAmqpClient();
        const config = { userName: 'test', password: 'test' };

        // system under test
        const coreRabbitService = CoreRabbitService.create(config, this.__logger, mockAmqpClient);
        await coreRabbitService.initialize();

        // starting a new queue is done via asserting on a channel
        const channel = coreRabbitService.getChannel();
        channel.assertQueue('TEST_QUEUE', { durable: false });
        channel.prefetch(1);

        // expectations
        expect(mockAmqpClient.counter.connectCount).to.equal(1);
        expect(mockAmqpClient.counter.createChannelCount).to.equal(1);
        expect(mockAmqpClient.counter.channelAssertQueueCount).to.equal(1);
        expect(mockAmqpClient.counter.channelPrefetchCount).to.equal(1);

        coreRabbitService.stop();
    });

    it('successfully sets a queue handler', async () => {

        // mock rabbit client
        const mockAmqpClient = createMockAmqpClient();

        const config = { userName: 'test', password: 'test' };

        // system under test
        const coreRabbitService = CoreRabbitService.create(config, this.__logger, mockAmqpClient);

        await coreRabbitService.initialize();

        // starting a new queue is done via asserting on a channel
        const channel = coreRabbitService.getChannel();
        channel.assertQueue('TEST_QUEUE', { durable: false });
        channel.prefetch(1);

        // set the queue handler
        coreRabbitService.setHandler('TEST_QUEUE', () => { });

        // channel.consume is used to set the handler on the core service
        expect(mockAmqpClient.counter.channelConsumeCount).to.equal(1);
    });


    it('successfully reconnects when connection closed event raised', () => {

        return new Promise((resolve, reject) => {

            // mock rabbit client
            const mockAmqpClient = createMockAmqpClient();
            const config = { userName: 'test', password: 'test' };

            // system under test
            const coreRabbitService = CoreRabbitService.create(config, this.__logger, mockAmqpClient);

            let closedHandler = () => {

                expect(mockAmqpClient.counter.connectCount).to.equal(2);    // initial connection + reconnect
                expect(mockAmqpClient.counter.connectionCloseEventCount).to.equal(1);   // single closed event
                expect(mockAmqpClient.counter.createChannelCount).to.equal(2);  // initial channel creation + recreate
                expect(mockAmqpClient.counter.channelAssertQueueCount).to.equal(1);
                expect(mockAmqpClient.counter.channelPrefetchCount).to.equal(1);

                coreRabbitService.stop();

                resolve();
            }

            let setup = async () => {

                coreRabbitService.on('connectionClosed', closedHandler);
                await coreRabbitService.initialize();

                // starting a new queue is done via asserting on a channel
                const channel = coreRabbitService.getChannel();
                channel.assertQueue('TEST_QUEUE', { durable: false });
                channel.prefetch(1);

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
            const config = { userName: 'test', password: 'test' };

            // system under test
            const coreRabbitService = CoreRabbitService.create(config, this.__logger, mockAmqpClient);

            let closedHandler = () => {

                closedCount++;

                if (closedCount === 2) {
                    // expectations
                    expect(mockAmqpClient.counter.connectCount).to.equal(2);
                    expect(mockAmqpClient.counter.createChannelCount).to.equal(2);
                    expect(mockAmqpClient.counter.channelAssertQueueCount).to.equal(1);
                    expect(mockAmqpClient.counter.channelPrefetchCount).to.equal(1);

                    coreRabbitService.stop();

                    resolve();
                }
            }

            let setup = async () => {

                coreRabbitService.on('connectionClosed', closedHandler);
                await coreRabbitService.initialize();

                // starting a new queue is done via asserting on a channel
                const channel = coreRabbitService.getChannel();
                channel.assertQueue('TEST_QUEUE', { durable: false });
                channel.prefetch(1);

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
            const config = { userName: 'test', password: 'test' };

            // system under test
            const coreRabbitService = CoreRabbitService.create(config, this.__logger, mockAmqpClient);

            let errorHandler = () => {

                // expectations
                expect(mockAmqpClient.counter.connectionErrorEventCount).to.equal(1);
                expect(mockAmqpClient.counter.connectCount).to.equal(2);
                expect(mockAmqpClient.counter.channelErrorEventCount).to.equal(0);
                expect(mockAmqpClient.counter.createChannelCount).to.equal(2);

                coreRabbitService.stop();

                resolve();
            }

            let setup = async () => {
                coreRabbitService.on('connectionError', errorHandler);
                await coreRabbitService.initialize();

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
            const config = { userName: 'test', password: 'test' };

            // system under test
            const coreRabbitService = CoreRabbitService.create(config, this.__logger, mockAmqpClient);

            let errorHandler = () => {

                // expectations
                expect(mockAmqpClient.counter.connectionErrorEventCount).to.equal(0);
                expect(mockAmqpClient.counter.connectCount).to.equal(1);
                expect(mockAmqpClient.counter.channelErrorEventCount).to.equal(1);
                expect(mockAmqpClient.counter.createChannelCount).to.equal(1);

                coreRabbitService.stop();

                resolve();
            }

            let setup = async () => {
                coreRabbitService.on('channelError', errorHandler);
                await coreRabbitService.initialize();

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
        const config = { userName: 'test', password: 'test' };
        const coreRabbitService = CoreRabbitService.create(config, this.__logger, mockAmqpClient);

        await coreRabbitService.initialize();
        await coreRabbitService.stop();

        expect(mockAmqpClient.counter.connectCount).to.equal(1);
        expect(mockAmqpClient.counter.createChannelCount).to.equal(1);
        expect(mockAmqpClient.counter.connectionClosedCount).to.equal(1);
        expect(mockAmqpClient.counter.channelClosedCount).to.equal(1);

    });

    it('successfully attempts to reconnect when queue connection error is caught', () => {

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
            const coreRabbitService = CoreRabbitService.create(config, this.__logger, mockAmqpClient);

            let serviceStoppedHandler = () => {

                // expectations
                expect(mockAmqpClient.counter.connectCount).to.equal(5);

                coreRabbitService.stop();
                resolve();
            }

            let setup = async () => {
                coreRabbitService.on('serviceStopped', serviceStoppedHandler);
                await coreRabbitService.initialize();
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

            let config = {
                maxReconnectDelay: 10000,
                maxReconnectRetries: 4,
                reconnectDelayAfter: 1000
            };

            // system under test
            const coreRabbitService = CoreRabbitService.create(config, this.__logger, mockAmqpClient);

            let serviceStoppedHandler = () => {

                // expectations
                expect(mockAmqpClient.counter.connectCount).to.equal(1);
                expect(mockAmqpClient.counter.createChannelCount).to.equal(1);
                expect(mockAmqpClient.counter.channelClosedCount).to.equal(1);
                expect(mockAmqpClient.counter.connectionClosedCount).to.equal(1);

                resolve();
            }

            let setup = async () => {
                coreRabbitService.on('serviceStopped', serviceStoppedHandler);
                await coreRabbitService.initialize();
                coreRabbitService.stop();
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

