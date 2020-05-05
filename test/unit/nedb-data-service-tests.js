const expect = require('expect.js');
const Mocker = require('mini-mock');
const Nedb = require('happn-nedb');

const DataService = require('../../lib/services/nedb-data-service');
const Utils = require('../../lib/utils/utils');
const Stave = require('stave');

describe('nedb-data-service-tests', function () {

    // this.timeout(30000);

    before('setup', async () => {

        this.__utils = new Utils();
        this.__stave = new Stave();
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

    it('successfully upserts data where path and options not present', async () => {

        const mockNedb = this.__mocker.mock(Nedb.prototype)
            .withAsyncStub('findOne', [null, {}])
            .withAsyncStub('update', [null, {}])
            .create();

        const utils = new Utils();

        // system under test
        const dataService = this.__stave.trace(DataService.create(this.__config, this.__logger, mockNedb, utils));

        let testMsg = {
            path: '/test',
            data: { testKey: 'testValue' }
        };

        let result = await dataService.upsert(testMsg);
        expect(result.data).to.equal(testMsg.data);

    });

    it('successfully upserts data as a sibling', async () => {

        const mockNedb = this.__mocker.mock(Nedb.prototype)
            .withAsyncStub('findOne', [null, {}])
            .withAsyncStub('update', [null, {}])
            .create();

        const utils = new Utils();

        // system under test
        const dataService = this.__stave.trace(DataService.create(this.__config, this.__logger, mockNedb, utils));

        let testMsg = {
            path: '/test',
            data: { testKey: 'testValue' },
            options: {
                set_type: 'sibling'
            }
        };

        let result = await dataService.upsert(testMsg);
        expect(result.data).to.equal(testMsg.data);
        expect(result._meta.path.split('/').length).to.equal(3);    // path should look something like: '/test/R39Nn_2hSnmrAtSta_VI9g-0'

    });

    it('successfully upserts a tag', async () => {

        const mockNedb = this.__mocker.mock(Nedb.prototype)
            .withAsyncStub('findOne', [null, {}])
            .withAsyncStub('update', [null, {}])
            .create();

        const utils = new Utils();

        // system under test
        const dataService = this.__stave.trace(DataService.create(this.__config, this.__logger, mockNedb, utils));

        let testMsg = {
            path: '/test',
            options: {
                tag: 'test_tag'
            }
        };

        let result = await dataService.upsert(testMsg);
        expect(result.data).to.eql({});
        expect(result._meta.path.split('/').length).to.equal(2);    // path should look something like: '/test/R39Nn_2hSnmrAtSta_VI9g-0'

    });

    it('throws an error if no data or path', async () => {

        const mockNedb = this.__mocker.mock(Nedb.prototype)
            .withAsyncStub('findOne', [null, {}])
            .withAsyncStub('update', [null, {}])
            .create();

        const utils = new Utils();

        // system under test
        const dataService = this.__stave.trace(DataService.create(this.__config, this.__logger, mockNedb, utils));

        let testMsg = {};

        try {
            await dataService.upsert(testMsg);
        } catch (err) {
            expect(err.message).to.equal('No path defined; No data defined');
        }

    });

    it('throws an error if data and tag present in same payload', async () => {

        const mockNedb = this.__mocker.mock(Nedb.prototype)
            .withAsyncStub('findOne', [null, {}])
            .withAsyncStub('update', [null, {}])
            .create();

        const utils = new Utils();

        // system under test
        const dataService = this.__stave.trace(DataService.create(this.__config, this.__logger, mockNedb, utils));

        let testMsg = {
            data: { testKey: 'testValue' },
            path: '/test',
            options: {
                tag: 'test_tag'
            }
        };

        try {
            await dataService.upsert(testMsg);
        } catch (err) {
            expect(err.message).to.equal('Cannot set tag with new data.');
        }

    });

    it('successfully merges data', async () => {

        let updatedTimeStamp = Date.now();

        let initial = {
            e: null,
            response: 1,
            created:
            {
                _id: '/merge/6712s1MCG',
                data: { test: 'data' },
                path: '/merge/6712s1MCG',
                created: 1588589116078,
                modified: 1588589116078
            },
            upsert: true,
            meta:
            {
                created: 1588589116078,
                modified: 1588589116078,
                modifiedBy: undefined,
                path: '/merge/6712s1MCG',
                _id: '/merge/6712s1MCG'
            }
        };

        let updated = {
            e: null,
            response: 1,
            created: undefined,
            upsert: undefined,
            meta:
            {
                created: 1588589116078,
                modified: 1588589117087,
                _id: '/merge/6712s1MCG',
                path: '/merge/6712s1MCG'
            }
        }

        const mockNedb = this.__mocker.mock(Nedb.prototype)
            .withAsyncStub('findOne', [null, initial])
            .withAsyncStub('update', [null, updated])
            .create();

        const utils = new Utils();

        // system under test
        // const dataService = this.__utils.traceMethodCalls(DataService.create(this.__config, this.__logger, mockNedb, utils));
        const dataService = DataService.create(this.__config, this.__logger, mockNedb, utils);

        let msg = {
            data: { testKey: 'testValue', testKey2: 'testKey2Value' },
            path: '/merge/6712s1MCG',
            options: {
                merge: true
            }
        };

        let result = {
            data: { testKey: 'testValue', testKey2: 'testKey2Value' },
            _meta:
            {
                created: undefined,
                modified: undefined,
                modifiedBy: undefined,
                path: '/merge/6712s1MCG',
                _id: undefined
            },
            response:
            {
                e: null,
                response: 1,
                created: undefined,
                upsert: undefined,
                meta:
                {
                    created: 1588589116078,
                    modified: 1588589117087,
                    _id: '/merge/6712s1MCG',
                    path: '/merge/6712s1MCG'
                }
            }
        };

        let upserted = await dataService.upsert(msg);
        // expect(upserted).to.equal(updated);

    });

    // TODO: merge

})