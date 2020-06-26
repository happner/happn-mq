const expect = require('expect.js');
const Mocker = require('mini-mock');

const CoreRabbitService = require('../../../../lib/services/common/queues/core-rabbit-service');
const QueueService = require('../../../../lib/services/common/queues/fifo/rabbit-queue-service');

describe('rabbit-fifo-queue-service-tests', function () {

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

    it('successfully starts a queue', () => {

        const mockCoreRabbitService = this.__mocker.mock(CoreRabbitService.prototype)
            .withSyncStub('startQueue', null)
            .create();

        const config = { userName: 'test', password: 'test' };

        // system under test
        const queueService = QueueService.create(config, this.__logger, mockCoreRabbitService);
        queueService.startQueue('TEST_QUEUE');

        expect(mockCoreRabbitService.recorder['startQueue'].calls).to.equal(1);

    });

    it('successfully sets a queue handler', () => {

        const mockCoreRabbitService = this.__mocker.mock(CoreRabbitService.prototype)
            .withSyncStub('setHandler', null)
            .create();

        const config = { userName: 'test', password: 'test' };

        // system under test
        const queueService = QueueService.create(config, this.__logger, mockCoreRabbitService);
        queueService.setHandler('TEST_QUEUE', (queueName, handler) => { });

        expect(mockCoreRabbitService.recorder['setHandler'].calls).to.equal(1);

    });

    it('successfully adds an item to a queue', () => {

        const mockChannel = {
            assertCount: 0,
            prefetchCount: 0,
            sendToQueueCount: 0,
            assertQueue: () => { mockChannel.assertCount += 1; },
            prefetch: () => { mockChannel.prefetchCount += 1; },
            sendToQueue: (queueName, message) => { console.log('SENDING TO QUEUE....'); mockChannel.sendToQueueCount += 1; }
        };

        const mockCoreRabbitService = {
            setHandlerCount: 0,
            setHandler: (queueName, handler) => {
                mockCoreRabbitService.setHandlerCount += 1;
            },
            getChannel: () => {
                console.log('Returning mock channel: ', mockChannel);
                return mockChannel;
            }
        };

        const config = { userName: 'test', password: 'test' };

        // system under test
        const queueService = QueueService.create(config, this.__logger, mockCoreRabbitService);
        queueService.add('TEST_QUEUE', '{"test":"message"}');

        // expectations
        expect(mockChannel.sendToQueueCount).to.equal(1);

    });
})

