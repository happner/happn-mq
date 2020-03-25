const expect = require('expect.js');
const Mocker = require('mini-mock');

const QueueService = require('../../lib/services/rabbit-queue-service');
const RouterService = require('../../lib/services/router-service');
const SecurityService = require('../../lib/services/security-service');
const ActionService = require('../../lib/services/actions/base-action');
const ActionServiceFactory = require('../../lib/factories/action-service-factory');

describe('router-service-tests', async () => {

    before('setup', async () => {

        this.__mocker = new Mocker();
        this.__config = {};
        this.__logger = {
            info: (msg, obj) => { console.log(msg, obj); },
            warn: (msg, obj) => { console.warn(msg, obj); },
            debug: (msg, obj) => { if (!obj) console.debug(msg); else console.debug(msg, obj) },
            error: (msg, err) => { console.error(msg, err); }
        }
    });

    after('stop', async () => {
    });

    it('successfully starts router service', async () => {

        const mockQueueService = this.__mocker.mock(QueueService.prototype)
            .withPromiseStub('setHandler', {})
            .create();

        // system under test
        const routerService = RouterService.create(this.__config, this.__logger, mockQueueService, null, null);
        await routerService.start();

        // expectations
        expect(mockQueueService.recorder['setHandler'].calls).to.equal(1);

    });

    it('successfully handles and acks queue item', async () => {

        const mockQueueService = {};

        const mockSecurityService = this.__mocker.mock(SecurityService.prototype)
            .withPromiseStub('processAuthorize', { request: { action: 'testAction' } })
            .create();

        const mockAction = this.__mocker.mock(ActionService.prototype)
            .withSyncStub('process', {})
            .create();

        const mockActionServiceFactory = this.__mocker.mock(ActionServiceFactory.prototype)
            .withSyncStub('getActionService', mockAction)
            .create();

        const mockChannel = { ack: () => { console.log('acked!'); mockChannel.ackCount += 1; }, ackCount: 0 };
        const mockMsg = { content: '{ "raw": { "action": "testAction" } }' };

        // system under test
        const routerService = RouterService.create(this.__config, this.__logger, mockQueueService, mockSecurityService, mockActionServiceFactory);
        await routerService.queueItemHandler(mockChannel, mockMsg);

        // expectations
        expect(mockSecurityService.recorder['processAuthorize'].calls).to.equal(1);
        expect(mockActionServiceFactory.recorder['getActionService'].calls).to.equal(1);
        expect(mockAction.recorder['process'].calls).to.equal(1);
        expect(mockChannel.ackCount).to.equal(1);

    });

    it('successfully returns if queue item is null or empty', async () => {

        const mockQueueService = {};

        const mockSecurityService = this.__mocker.mock(SecurityService.prototype)
            .withPromiseStub('processAuthorize', { request: { action: 'testAction' } })
            .create();

        const mockAction = this.__mocker.mock(ActionService.prototype)
            .withSyncStub('process', {})
            .create();

        const mockActionServiceFactory = this.__mocker.mock(ActionServiceFactory.prototype)
            .withSyncStub('getActionService', mockAction)
            .create();

        const mockChannel = { ack: () => { console.log('acked!'); mockChannel.ackCount += 1; }, ackCount: 0 };
        const mockMsg = null;

        // system under test
        const routerService = RouterService.create(this.__config, this.__logger, mockQueueService, mockSecurityService, mockActionServiceFactory);
        await routerService.queueItemHandler(mockChannel, mockMsg);

        // expectations
        expect(mockSecurityService.recorder['processAuthorize'].calls).to.equal(0);
        expect(mockActionServiceFactory.recorder['getActionService'].calls).to.equal(0);
        expect(mockAction.recorder['process'].calls).to.equal(0);
        expect(mockChannel.ackCount).to.equal(0);
    });

    it('successfully acks queue item when an error occurs', async () => {

        const mockQueueService = {};

        const mockSecurityService = this.__mocker.mock(SecurityService.prototype)
            .withPromiseStub('processAuthorize', null, new Error('Unauthorized!'))
            .create();

        const mockChannel = { ack: () => { console.log('acked!'); mockChannel.ackCount += 1; }, ackCount: 0 };
        const mockMsg = { content: '{ "raw": { "action": "testAction" } }' };

        // system under test
        const routerService = RouterService.create(this.__config, this.__logger, mockQueueService, mockSecurityService, null);

        await routerService.queueItemHandler(mockChannel, mockMsg);

        // expectations
        expect(mockSecurityService.recorder['processAuthorize'].calls).to.equal(1);
        expect(mockChannel.ackCount).to.equal(1);
    });

})