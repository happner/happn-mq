const expect = require('expect.js');
const Mocker = require('mini-mock');

const ActionServiceFactory = require('../../lib/factories/action-service-factory');
const DescribeAction = require('../../lib/services/actions/describe');

describe('action-service-factory-tests', async () => {

    before('setup', async () => {

        this.__mocker = new Mocker();
        this.__config = {};
        this.__logger = {
            info: (msg, obj) => { if (!obj) console.info(msg); else console.info(msg, obj); },
            warn: (msg, obj) => { if (!obj) console.warn(msg); else console.warn(msg, obj); },
            debug: (msg, obj) => { if (!obj) console.debug(msg); else console.debug(msg, obj) },
            error: (msg, err) => { if (!err) console.error(msg); else console.error(msg, err) }
        }
    });

    after('stop', async () => {
    });

    it('successfully gets an action service', async () => {

        let describeAction = new DescribeAction();

        // system under test
        const actionServiceFactory = ActionServiceFactory.create(this.__config, this.__logger, { describeAction });
        let actionService = actionServiceFactory.getActionService('describe');

        expect(actionService instanceof DescribeAction).to.equal(true);
    });

    it('successfully throws an error when attempting to get an invalid action service', async () => {

        // system under test
        const actionServiceFactory = ActionServiceFactory.create(this.__config, this.__logger, {});

        try {
            actionServiceFactory.getActionService('abc');
        } catch (err) {
            expect(err.message).to.equal("Cannot find module '../services/actions/abc'");
        }
    });

})