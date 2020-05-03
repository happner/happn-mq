const expect = require('expect.js');
const Mocker = require('mini-mock');
const Nedb = require('happn-nedb');

const DataService = require('../../lib/services/nedb-data-service');
const Utils = require('../../lib/utils/utils');

describe('nedb-data-service-tests', function () {

    // this.timeout(30000);

    before('setup', async () => {

        this.__utils = new Utils();
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

    it('successfully upserts data', async () => {

        const mockNedb = this.__mocker.mock(Nedb.prototype)
            .withAsyncStub('findOne', {})
            .withAsyncStub('update', {})
            .create();

        const utils = new Utils();

        // system under test (using utils.traceMethodCalls to get detailed tracing)
        const dataService = this.__utils.traceMethodCalls(DataService.create(this.__config, this.__logger, mockNedb, utils));

        let testMsg = {
            path: '/test',
            data: { testKey: 'testValue' }
        };

        try {
            let result = await dataService.upsert(testMsg);
            expect(result.data).to.equal(testMsg.data);
        } catch (err) {
            throw err;
        }

    });

})