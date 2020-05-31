const expect = require('expect.js');

const DataService = require('../../lib/services/data/nedb-data-service');

describe('nedb-data-service-tests', function () {

    // this.timeout(30000);

    before('setup', async () => {

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

    it('successfully stores new record with path and NO OPTIONS', async () => {

        let initialTimeStamp = Date.now();

        // mock nedb update callback parameters
        let response = 1;
        let created = {
            _id: '/test',
            data: { testKey: 'testValue' },
            path: '/test',
            modifiedBy: undefined,
            _tag: undefined,
            created: initialTimeStamp,
            modified: initialTimeStamp
        };
        let upserted = undefined;
        let meta = {
            created: initialTimeStamp,
            modified: initialTimeStamp,
            _id: '/test',
            path: '/test'
        };

        const mockNedbRepository = {
            getOneByPath: async () => {
                return null;
            },
            update: async () => {
                return { response, created, upserted, meta };
            }
        }

        const mockUpsertBuilder = {
            withPath: () => { return mockUpsertBuilder; },
            withData: () => { return mockUpsertBuilder; },
            withOptions: () => { return mockUpsertBuilder; },
            withFindByPathFunc: () => { return mockUpsertBuilder; },
            build: async () => {
                return {
                    setParams:
                    {
                        '$set':
                        {
                            data: { testKey: 'testValue' },
                            _id: '/test',
                            path: '/test',
                            modifiedBy: undefined,
                            _tag: undefined
                        }
                    },
                    path: '/test',
                    data: { testKey: 'testValue' },
                    options: { upsert: true },
                    setData: { data: { testKey: 'testValue' }, _meta: { path: '/test' } }
                }
            }
        }

        // system under test
        const dataService = DataService.create(this.__config, this.__logger, mockNedbRepository, null, mockUpsertBuilder);

        // incoming test message
        let testMsg = {
            request: {
                path: '/test',
                data: { testKey: 'testValue' }
            }
        };

        let result = await dataService.processStore(testMsg);

        // expectations
        let expectedResult = {
            request: {
                path: '/test',
                data: { testKey: 'testValue' }
            },
            response:
            {
                data: { testKey: 'testValue' },
                _meta:
                {
                    created: initialTimeStamp,
                    modified: initialTimeStamp,
                    _id: '/test',
                    path: '/test'
                }
            }
        };

        expect(result).to.eql(expectedResult);

    });

    it('successfully stores new record with path AND OPTIONS', async () => {

        let initialTimeStamp = Date.now();

        // mock nedb update callback parameters
        let response = 1;
        let created = {
            _id: '/test',
            data: {
                property1: 'property1',
                property2: 'property2',
                property3: 'property3'
            },
            path: '/test',
            modifiedBy: undefined,
            _tag: undefined,
            created: initialTimeStamp,
            modified: initialTimeStamp
        };
        let upserted = undefined;
        let meta = {
            created: initialTimeStamp,
            modified: initialTimeStamp,
            _id: '/test',
            path: '/test'
        };

        const mockNedbRepository = {
            getOneByPath: async () => {
                return null;
            },
            update: async () => {
                return { response, created, upserted, meta }
            }
        }

        const mockUpsertBuilder = {
            withPath: () => { return mockUpsertBuilder; },
            withData: () => { return mockUpsertBuilder; },
            withOptions: () => { return mockUpsertBuilder; },
            withFindByPathFunc: () => { return mockUpsertBuilder; },
            build: async () => {
                return {
                    setParams:
                    {
                        '$set':
                        {
                            data: {
                                property1: 'property1',
                                property2: 'property2',
                                property3: 'property3'
                            },
                            _id: '/test',
                            path: '/test',
                            modifiedBy: undefined,
                            _tag: undefined
                        }
                    },
                    path: '/test',
                    data:
                    {
                        property1: 'property1',
                        property2: 'property2',
                        property3: 'property3'
                    },
                    options: { noPublish: true, timeout: 60000, upsertType: 2, upsert: true },
                    setData:
                    {
                        data:
                        {
                            property1: 'property1',
                            property2: 'property2',
                            property3: 'property3'
                        },
                        _meta: { path: '/test' }
                    }
                }
            }
        }

        // system under test
        const dataService = DataService.create(this.__config, this.__logger, mockNedbRepository, null, mockUpsertBuilder);

        let testMsg = {
            request: {
                path: '/test',
                data: {
                    property1: 'property1',
                    property2: 'property2',
                    property3: 'property3'
                },
                options: {
                    noPublish: true,
                    // merge: true,
                    timeout: 60000,
                    upsertType: 2,
                    upsert: true
                }
            }
        };

        // expectations
        let expectedResult = {
            request: {
                path: '/test',
                data: {
                    property1: 'property1',
                    property2: 'property2',
                    property3: 'property3'
                },
                options: {
                    noPublish: true,
                    timeout: 60000,
                    upsertType: 2,
                    upsert: true
                }
            },
            response:
            {
                data: {
                    property1: 'property1',
                    property2: 'property2',
                    property3: 'property3'
                },
                _meta:
                {
                    created: initialTimeStamp,
                    modified: initialTimeStamp,
                    _id: '/test',
                    path: '/test'
                }
            }
        };

        let result = await dataService.processStore(testMsg);
        expect(result).to.eql(expectedResult);

    });

    // upsert as SIBLING doesn't require that an initial record exists - it will always append a unique id at the end of the path...
    it('successfully stores record as a SIBLING', async () => {

        let initialTimeStamp = Date.now();

        // mock nedb update callback parameters
        let response = 1;
        let created = {
            _id: '/test/TU39r0IdTYSmfwB4HVi-NA-0',
            data: { testKey: 'testValue' },
            path: '/test/TU39r0IdTYSmfwB4HVi-NA-0',
            modifiedBy: undefined,
            _tag: undefined,
            created: initialTimeStamp,
            modified: initialTimeStamp
        };
        let upserted = undefined;
        let meta = {
            created: initialTimeStamp,
            modified: initialTimeStamp,
            _id: '/test',
            path: '/test'
        };

        const mockNedbRepository = {
            getOneByPath: async () => {
                return null;
            },
            update: async () => {
                return { response, created, upserted, meta }
            }
        }

        const mockUpsertBuilder = {
            withPath: () => { return mockUpsertBuilder; },
            withData: () => { return mockUpsertBuilder; },
            withOptions: () => { return mockUpsertBuilder; },
            withFindByPathFunc: () => { return mockUpsertBuilder; },
            build: async () => {
                return {
                    setParams:
                    {
                        '$set':
                        {
                            data: [Object],
                            _id: '/test/Y4M-GiXmS66yXe0dnbiGhQ-0',
                            path: '/test/Y4M-GiXmS66yXe0dnbiGhQ-0',
                            modifiedBy: undefined,
                            _tag: undefined
                        }
                    },
                    path: '/test/Y4M-GiXmS66yXe0dnbiGhQ-0',
                    data: { testKey: 'testValue' },
                    options: { set_type: 'sibling', upsert: true },
                    setData:
                    {
                        data: { testKey: 'testValue' },
                        _meta: { path: '/test/Y4M-GiXmS66yXe0dnbiGhQ-0' }
                    }
                }
            }
        }

        // system under test
        const dataService = DataService.create(this.__config, this.__logger, mockNedbRepository, null, mockUpsertBuilder);

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
        console.log('RESULT: ', result);
        expect(result.response.data).to.eql(testMsg.request.data);
        expect(result.response._meta.path.split('/').length).to.equal(3);    // path should look something like: '/test/R39Nn_2hSnmrAtSta_VI9g-0'

    });

    // TODO: fix this
    // xit('successfully tags an existing record', async () => {

    //     let initialTimeStamp = Date.now();

    //     // assumes that an initial set was done on path '/merge/6712s1MCG' with data: { test: 'data' },
    //     let dbFindOneResult = {
    //         _id: '/test',
    //         data: { test: 'data' },
    //         path: '/test',
    //         created: initialTimeStamp,
    //         modified: initialTimeStamp
    //     };

    //     // mock nedb update callback parameters
    //     let response = 1;
    //     let created = {
    //         _id: '/test',
    //         data: { testKey: 'testValue' },
    //         path: '/test',
    //         modifiedBy: undefined,
    //         _tag: 'test_tag',
    //         created: initialTimeStamp,
    //         modified: initialTimeStamp
    //     };
    //     let upserted = undefined;
    //     let meta = {
    //         created: initialTimeStamp,
    //         modified: initialTimeStamp,
    //         _id: '/test',
    //         path: '/test'
    //     };

    //     const mockNedbRepository = {
    //         getOneByPath: async () => {
    //             return dbFindOneResult;
    //         },
    //         update: async () => {
    //             return { response, created, upserted, meta };
    //         }
    //     }

    //     // system under test
    //     const dataService = DataService.create(this.__config, this.__logger, mockNedbRepository, null, null);

    //     let testMsg = {
    //         request: {
    //             path: '/test',
    //             options: {
    //                 tag: 'test_tag'
    //             }
    //         }
    //     };

    //     let expectedResult = {
    //         request: {
    //             path: '/test',
    //             options: {
    //                 tag: 'test_tag'
    //             }
    //         },
    //         response:
    //         {
    //             data: { testKey: 'testValue' },
    //             _meta:
    //             {
    //                 created: 1590765186203,
    //                 modified: 1590765186203,
    //                 _id: '/test',
    //                 path: '/test',
    //                 tag: 'test_tag'
    //             }
    //         }
    //     }

    //     let result = await dataService.processStore(testMsg);

    //     console.log(result);

    //     expect(result.response.data).to.eql({});
    //     expect(result.response._meta.path.split('/').length).to.equal(2);    // path should look something like: '/test/R39Nn_2hSnmrAtSta_VI9g-0'

    // });

    it('throws an error if no data or path', async () => {

        const mockNedbRepository = {
            getOneByPath: async () => {
                return null;
            },
            update: async () => {
                return null;
            }
        }

        // system under test
        const dataService = DataService.create(this.__config, this.__logger, mockNedbRepository, null, null);

        let testMsg = { request: {} };

        try {
            await dataService.processStore(testMsg);
        } catch (err) {
            expect(err.message).to.equal('No path defined; No data defined');
        }

    });

    it('throws an error if data and tag present in same payload', async () => {

        const mockNedbRepository = {
            getOneByPath: async () => {
                return null;
            },
            update: async () => {
                return null;
            }
        }

        // system under test
        const dataService = DataService.create(this.__config, this.__logger, mockNedbRepository, null, null);

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

        // assumes that an INITIAL set was done on path '/merge/6712s1MCG' with data: { test: 'data' },
        let dbFindOneResult = {
            _id: '/merge/6712s1MCG',
            data: { test: 'data' },
            path: '/merge/6712s1MCG',
            created: initialTimeStamp,
            modified: initialTimeStamp
        };

        let updatedTimeStamp = initialTimeStamp + 10;

        // the result of an update of existing path being done on nedb 
        let response = 1;
        let created = undefined;
        let upserted = undefined;
        let meta = {
            created: initialTimeStamp,
            modified: updatedTimeStamp,
            _id: '/merge/6712s1MCG',
            path: '/merge/6712s1MCG'
        };

        const mockNedbRepository = {
            getOneByPath: async () => {
                return dbFindOneResult;
            },
            update: async () => {
                return { response, created, upserted, meta };
            }
        }

        // test payload for a SECOND set request (with merge=true) on path '/merge/6712s1MCG', which should merge the data with a previous set's data..
        let msg = {
            session: {
                id: "7c1fea4f-1f14-40f1-a39b-00f469a03d00",
                protocol: "happn_4",
                happn: {
                    name: "voidferret_XRzXb8ejo",
                    secure: false,
                    encryptPayloads: false,
                    publicKey: "AhEPwvOAms3fADkGxyaxfcnniPFilxeHjqVXlcq1aqz9"
                },
                info: {
                    _browser: false,
                    _local: false
                }
            },
            request: {
                action: "set",
                eventId: 5,
                data: { testKey: 'testValue', testKey2: 'testKey2Value' },
                path: '/merge/6712s1MCG',
                options: {
                    merge: true
                }
            }
        };

        const mockUpsertBuilder = {
            withPath: () => { return mockUpsertBuilder; },
            withData: () => { return mockUpsertBuilder; },
            withOptions: () => { return mockUpsertBuilder; },
            withFindByPathFunc: () => { return mockUpsertBuilder; },
            build: async () => {
                return {
                    setParams:
                    {
                        '$set':
                        {
                            data: [Object],
                            _id: '/merge/6712s1MCG',
                            path: '/merge/6712s1MCG',
                            modifiedBy: undefined,
                            _tag: undefined
                        }
                    },
                    path: '/merge/6712s1MCG',
                    data: { testKey: 'testValue', testKey2: 'testKey2Value', test: 'data' },
                    options: { merge: true, upsert: true, updateType: 1 },
                    setData:
                    {
                        data: { testKey: 'testValue', testKey2: 'testKey2Value', test: 'data' },
                        _meta: { path: '/merge/6712s1MCG' },
                        created: 1590921704771,
                        modified: 1590921704773,
                        _id: '/merge/6712s1MCG'
                    }
                }
            }
        }

        const dataService = DataService.create(this.__config, this.__logger, mockNedbRepository, null, mockUpsertBuilder);

        // system under test
        let stored = await dataService.processStore(msg);

        console.log('STORED: ', stored);

        // expectations...
        let expectedResponse = {
            data: {
                testKey: 'testValue',
                testKey2: 'testKey2Value',
                test: 'data'
            },
            _meta:
            {
                created: initialTimeStamp,
                modified: updatedTimeStamp,
                path: '/merge/6712s1MCG',
                _id: '/merge/6712s1MCG'
            }
        };

        console.log(msg.request.data)
        expect(stored.request.data).to.equal(msg.request.data);
        expect(stored.response.data).to.eql(expectedResponse.data);
        expect(stored.response._meta.created).to.eql(expectedResponse._meta.created);
        expect(stored.response._meta.modified > expectedResponse._meta.created);
        expect(stored.response._meta.path).to.eql(expectedResponse._meta.path);
        expect(stored.response._meta._id).to.eql(expectedResponse._meta._id);

    });

})