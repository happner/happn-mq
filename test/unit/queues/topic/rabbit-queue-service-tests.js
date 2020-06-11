const expect = require('expect.js');

const QueueService = require('../../../../lib/services/queues/topic/rabbit-queue-service');

describe('rabbit-topic-queue-service-tests', function () {

    this.timeout(20000);

    before('setup', async () => {

        this.__logger = {
            info: (msg, obj) => { if (!obj) console.info(msg); else console.info(msg, obj); },
            warn: (msg, obj) => { if (!obj) console.warn(msg); else console.warn(msg, obj); },
            debug: (msg, obj) => { if (!obj) console.debug(msg); else console.debug(msg, obj) },
            error: (msg, err) => { if (!err) console.error(msg); else console.error(msg, err) }
        }
    });

    after('stop', async () => {
    });

    it('successfully sets an exchange', () => {

        const mockChannel = {
            assertExchangeCount: 0,
            assertExchange: () => { mockChannel.assertExchangeCount += 1; }
        };

        const mockCoreRabbitService = {
            getChannelCount: 0,
            getChannel: () => {
                mockCoreRabbitService.getChannelCount += 1;
                return mockChannel;
            }
        };

        const config = {};

        // system under test
        const queueService = QueueService.create(config, this.__logger, mockCoreRabbitService);
        queueService.startExchange('TEST_EXCHANGE');

        expect(mockCoreRabbitService.getChannelCount).to.equal(1);
        expect(mockChannel.assertExchangeCount).to.equal(1);

    });

    it('successfully starts a queue', () => {

        const mockCoreRabbitService = {
            startQueueCount: 0,
            startQueue: () => {
                mockCoreRabbitService.startQueueCount += 1;
            }
        };

        const config = {};

        // system under test
        const queueService = QueueService.create(config, this.__logger, mockCoreRabbitService);
        queueService.startQueue('TEST_TOPIC_QUEUE');

        expect(mockCoreRabbitService.startQueueCount).to.equal(1);

    });

    it('successfully subscribes to a queue', async () => {

        const mockChannel = {
            bindQueueCount: 0,
            bindQueue: async () => { mockChannel.bindQueueCount += 1; }
        };

        const mockCoreRabbitService = {
            getChannelCount: 0,
            setHandlerCount: 0,
            getChannel: () => {
                mockCoreRabbitService.getChannelCount += 1;
                return mockChannel;
            },
            setHandler: () => {
                mockCoreRabbitService.setHandlerCount += 1;
            }
        };

        const config = {};

        // system under test
        const queueService = QueueService.create(config, this.__logger, mockCoreRabbitService);

        await queueService.subscribe('TEST_EXCHANGE', 'TEST_QUEUE', '*', '{"test":"item"}');

        expect(mockCoreRabbitService.getChannelCount).to.equal(1);
        expect(mockCoreRabbitService.setHandlerCount).to.equal(1);
        expect(mockChannel.bindQueueCount).to.equal(1);

    });

    it('successfully publishes to a queue', async () => {

        const mockChannel = {
            publishCount: 0,
            publish: () => { mockChannel.publishCount += 1; }
        };

        const mockCoreRabbitService = {
            getChannelCount: 0,
            getChannel: () => {
                mockCoreRabbitService.getChannelCount += 1;
                return mockChannel;
            }
        };

        const config = {};

        // system under test
        const queueService = QueueService.create(config, this.__logger, mockCoreRabbitService);

        await queueService.publish('TEST_EXCHANGE', 'test.key', '{"test":"item"}');

        expect(mockCoreRabbitService.getChannelCount).to.equal(1);
        expect(mockChannel.publishCount).to.equal(1);

    });



})

