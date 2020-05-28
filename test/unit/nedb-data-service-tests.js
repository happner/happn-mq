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

    it('successfully stores data with path and NO options', async () => {

        const mockNedb = this.__mocker.mock(Nedb.prototype)
            .withAsyncStub('findOne', [null, null])
            .withAsyncStub('update', [null, {}])
            .create();

        const utils = new Utils();

        // system under test
        const dataService = DataService.create(this.__config, this.__logger, mockNedb, utils);

        let testMsg = {
            request: {
                path: '/test',
                data: { testKey: 'testValue' }
            }
        };

        let result = await dataService.processStore(testMsg);
        expect(result.response.data).to.equal(testMsg.request.data);

    });

    it('successfully upserts data with path and options', async () => {

        const mockNedb = this.__mocker.mock(Nedb.prototype)
            .withAsyncStub('findOne', [null, null])
            .withAsyncStub('update', [null, {}])
            .create();

        const utils = new Utils();

        // system under test
        const dataService = DataService.create(this.__config, this.__logger, mockNedb, utils);

        let testMsg = {
            request: {
                path: '/test',
                data: {
                    data:
                    {
                        property1: 'property1',
                        property2: 'property2',
                        property3: 'property3'
                    },
                    _meta: { path: '/test' }
                },
                options: {
                    noPublish: true,
                    merge: true,
                    timeout: 60000,
                    upsertType: 2,
                    upsert: true
                }
            }
        };

        let result = await dataService.processStore(testMsg);
        expect(result.response.data).to.equal(testMsg.request.data);

    });

    it('successfully upserts data as a sibling', async () => {

        const mockNedb = this.__mocker.mock(Nedb.prototype)
            .withAsyncStub('findOne', [null, null])
            .withAsyncStub('update', [null, {}])
            .create();

        const utils = new Utils();

        // system under test
        const dataService = DataService.create(this.__config, this.__logger, mockNedb, utils);

        let testMsg = {
            request: {
                path: '/test',
                data: { testKey: 'testValue' },
                options: {
                    set_type: 'sibling'
                }
            }
        };

        let result = await dataService.processStore(testMsg);
        console.log(result);
        expect(result.response.data).to.equal(testMsg.request.data);
        expect(result.response._meta.path.split('/').length).to.equal(3);    // path should look something like: '/test/R39Nn_2hSnmrAtSta_VI9g-0'

    });

    it('successfully upserts a tag', async () => {

        const mockNedb = this.__mocker.mock(Nedb.prototype)
            .withAsyncStub('findOne', [null, null])
            .withAsyncStub('update', [null, {}])
            .create();

        const utils = new Utils();

        // system under test
        const dataService = DataService.create(this.__config, this.__logger, mockNedb, utils);

        let testMsg = {
            request: {
                path: '/test',
                options: {
                    tag: 'test_tag'
                }
            }
        };

        let result = await dataService.processStore(testMsg);
        expect(result.response.data).to.eql({});
        expect(result.response._meta.path.split('/').length).to.equal(2);    // path should look something like: '/test/R39Nn_2hSnmrAtSta_VI9g-0'

    });

    it('throws an error if no data or path', async () => {

        const mockNedb = this.__mocker.mock(Nedb.prototype)
            .withAsyncStub('findOne', [null, null])
            .withAsyncStub('update', [null, {}])
            .create();

        const utils = new Utils();

        // system under test
        const dataService = DataService.create(this.__config, this.__logger, mockNedb, utils);

        let testMsg = { request: {} };

        try {
            await dataService.processStore(testMsg);
        } catch (err) {
            expect(err.message).to.equal('No path defined; No data defined');
        }

    });

    it('throws an error if data and tag present in same payload', async () => {

        const mockNedb = this.__mocker.mock(Nedb.prototype)
            .withAsyncStub('findOne', [null, null])
            .withAsyncStub('update', [null, {}])
            .create();

        const utils = new Utils();

        // system under test
        const dataService = DataService.create(this.__config, this.__logger, mockNedb, utils);

        let testMsg = {
            request: {
                data: { testKey: 'testValue' },
                path: '/test',
                options: {
                    tag: 'test_tag'
                }
            }
        };

        try {
            await dataService.processStore(testMsg);
        } catch (err) {
            expect(err.message).to.equal('Cannot set tag with new data.');
        }

    });

    it('successfully merges data', async () => {

        let initialTimeStamp = Date.now();

        // assumes that an initial set was done on path '/merge/6712s1MCG' with data: { test: 'data' },
        let dbFindOneResult = {
            _id: '/merge/6712s1MCG',
            data: { test: 'data' },
            path: '/merge/6712s1MCG',
            created: initialTimeStamp,
            modified: initialTimeStamp
        };

        let updatedTimeStamp = initialTimeStamp + 10;

        // the result of an update of existing path being done on nedb 
        let dbUpdateResult = {
            e: null,
            response: 1,
            created: undefined,
            upserted: undefined,
            meta:
            {
                created: initialTimeStamp,
                modified: updatedTimeStamp,
                _id: '/merge/6712s1MCG',
                path: '/merge/6712s1MCG'
            }
        }

        const mockNedb = this.__mocker.mock(Nedb.prototype)
            .withAsyncStub('findOne', [null, dbFindOneResult])
            .withAsyncStub('update', [null, dbUpdateResult])
            .create();

        const utils = new Utils();

        // test payload for a second set request (with merge=true) on path '/merge/6712s1MCG', which should merge the data with a previous set's data..
        let msg = {
            request: {
                data: { testKey: 'testValue', testKey2: 'testKey2Value' },
                path: '/merge/6712s1MCG',
                options: {
                    merge: true
                }
            }
        };

        // const dataService = this.__utils.traceMethodCalls(DataService.create(this.__config, this.__logger, mockNedb, utils));
        const dataService = DataService.create(this.__config, this.__logger, mockNedb, utils);

        // system under test
        let stored = await dataService.processStore(msg);

        // expectations...
        let expectedResponse = {
            data: { testKey: 'testValue', testKey2: 'testKey2Value', test: 'data' },
            _meta:
            {
                created: undefined,
                modified: undefined,
                modifiedBy: undefined,
                path: '/merge/6712s1MCG',
                _id: '/merge/6712s1MCG'
            },
            response:
            {
                e: null,
                response: 1,
                created: undefined,
                upserted: undefined,
                meta:
                {
                    created: initialTimeStamp,
                    modified: updatedTimeStamp,
                    _id: '/merge/6712s1MCG',
                    path: '/merge/6712s1MCG'
                }
            }
        };

        expect(stored.response).to.eql(expectedResponse);

    });

})