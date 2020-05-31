const expect = require('expect.js');

const UpsertBuilder = require('../../../lib/builders/upsert-builder');

describe('upsert-builder-tests', async () => {

    before('setup', async () => {
    });

    after('stop', async () => {
    });

    it('successfully builds an upsert payload', async () => {

        let request = {
            data: { test: 'data' },
            path: '/test/data',
            options: {
                noPublish: true,
                timeout: 60000
            }
        };

        let builderResult = await UpsertBuilder
            .withData(request.data)
            .withOptions(request.options)
            .withPath(request.path)
            .withFindByPathFunc(async () => { return null })
            .build();

        let expectedResult = {
            setParams:
            {
                $set:
                {
                    data: { test: 'data' },
                    _id: '/test/data',
                    path: '/test/data',
                    modifiedBy: undefined,
                    _tag: undefined
                }
            },
            path: '/test/data',
            data: { test: 'data' },
            options: { noPublish: true, upsert: true, timeout: 60000 },
            setData: { data: { test: 'data' }, _meta: { path: '/test/data' } }
        }

        console.log('RESULT: ', builderResult);
        expect(builderResult).to.eql(expectedResult);

    });

    it('successfully builds an upsert payload with MERGE option', async () => {

        let request = {
            data: { test: 'data' },
            path: '/test/data',
            options: {
                noPublish: true,
                timeout: 60000,
                merge: true
            }
        };

        let builderResult = await UpsertBuilder
            .withData(request.data)
            .withOptions(request.options)
            .withPath(request.path)
            .withFindByPathFunc(async (path) => { return null })
            .build();

        let expectedResult = {
            setParams:
            {
                $set:
                {
                    data: { test: 'data' },
                    _id: '/test/data',
                    path: '/test/data',
                    modifiedBy: undefined,
                    _tag: undefined
                }
            },
            path: '/test/data',
            data: { test: 'data' },
            options: { noPublish: true, timeout: 60000, upsert: true, merge: true, upsertType: 2 },
            setData: { data: { test: 'data' }, _meta: { path: '/test/data' } }
        }

        console.log('RESULT: ', builderResult);
        expect(builderResult).to.eql(expectedResult);

    });

    it('successfully builds an upsert payload with SIBLING option', async () => {

        let request = {
            data: [{ test: 'data' }],   //array this time
            path: '/test/data',
            options: {
                noPublish: true,
                timeout: 60000,
                set_type: 'sibling'
            }
        };

        let builderResult = await UpsertBuilder
            .withData(request.data)
            .withOptions(request.options)
            .withPath(request.path)
            .withFindByPathFunc(async (path) => { return null })
            .build();

        let expectedResult = {
            setParams:
            {
                $set:
                {
                    data: { test: 'data' },
                    _id: '/test/data',
                    path: '/test/data',
                    modifiedBy: undefined,
                    _tag: undefined
                }
            },
            path: '/test/data',
            data: { test: 'data' },
            options: { noPublish: true, timeout: 60000 },
            setData: { data: { test: 'data' }, _meta: { path: '/test/data' } }
        }

        console.log('RESULT: ', builderResult);

        expect(builderResult.setParams.$set._id.split('/').length).to.eql(4);
        expect(builderResult.data).to.eql({ value: [{ test: 'data' }] });
        expect(builderResult.path.split('/').length).to.eql(4); // eg: "/test/data/r8HCPEhZTxiIoYzeDNV7ag-0"
        expect(builderResult.options).to.eql({ noPublish: true, timeout: 60000, upsert: true, set_type: 'sibling' });
        expect(builderResult.setData.data).to.eql({ value: [{ test: 'data' }] });
        expect(builderResult.setData._meta.path.split('/').length).to.eql(4);

    });
})