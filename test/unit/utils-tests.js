const expect = require('expect.js');
const Mocker = require('mini-mock');

const Utils = require('../../lib/utils/utils');

describe('set-results-builder-tests', async () => {

    before('setup', async () => {

        this.__testObj = {
            testSyncFunc: () => {
                return {
                    testField: 'testValue1'
                }
            },
            testSyncFuncWithError: () => {
                throw new Error('test sync func error');
            },
            testAsyncFunc: async () => {
                return {
                    testField: 'testValue2'
                }
            },
            testAsyncFuncWithError: async () => {
                throw new Error('test async func error');
            },
            testPromiseFunc: () => {
                return new Promise((resolve, reject) => {
                    resolve({
                        testField: 'testValue3'
                    })
                })
            },
            testPromiseFuncWithError: () => {
                return new Promise((resolve, reject) => {
                    return reject(new Error('test promise func error'));
                })
            }
        }

        this.__utils = Utils.create();
    });

    after('stop', async () => {
    });

    it('successfully clones an object', async () => {

        let obj = {
            level1: {
                level2: [
                    {
                        level3_1: 'blah1',
                        level3_2: 'blah2',
                        level3_3: 'blah3',
                    }
                ]
            },
            testFunc: () => {
                return 'func result';
            },
            testAsyncFunc: async () => {
                return 'async func result';
            }
        };

        let cloned = this.__utils.clone(obj);

        expect(cloned).to.eql(obj);
        expect(cloned.testFunc()).to.equal(obj.testFunc());
        expect(await cloned.testAsyncFunc()).to.equal(await obj.testAsyncFunc());
    });

    it('successfully pipes value through composed functions', async () => {

        let x = {};

        let func1 = (x) => {
            x['a'] = 'A';
            return x;
        }

        let func2 = (x) => {
            x['b'] = 'B';
            return x;
        }

        let compose = this.__utils.compose(func1, func2);

        let result = compose(x);

        expect(result).to.eql({ b: 'B', a: 'A' });
    });

    it('successfully wraps synchronous function', async () => {

        let wrapped = this.__utils.traceMethodCalls(this.__testObj);

        let result = wrapped.testSyncFunc();

        expect(result).to.eql(this.__testObj.testSyncFunc());
    });

    it('successfully wraps synchronous function and returns expected error', async () => {

        let wrapped = this.__utils.traceMethodCalls(this.__testObj);

        try {
            wrapped.testSyncFuncWithError();
        } catch (err) {
            expect(err.message).to.equal('test sync func error');
        }
    });

    it('successfully wraps asynchronous function', async () => {

        let wrapped = this.__utils.traceMethodCalls(this.__testObj);

        let result = await wrapped.testAsyncFunc();

        expect(result).to.eql(await this.__testObj.testAsyncFunc());
    });

    it('successfully wraps asynchronous function and returns expected error', async () => {

        let wrapped = this.__utils.traceMethodCalls(this.__testObj);

        try {
            await wrapped.testAsyncFuncWithError();
        } catch (err) {
            expect(err.message).to.equal('test async func error');
        }
    });

    it('successfully wraps promise function', async () => {

        let wrapped = this.__utils.traceMethodCalls(this.__testObj);

        wrapped.testPromiseFunc()
            .then(wrappedResult => {

                this.__testObj.testPromiseFunc()
                    .then(originalResult => {
                        expect(wrappedResult).to.eql(originalResult);
                    })

            });
    });

    it('successfully wraps promise function and returns expected error', async () => {

        let wrapped = this.__utils.traceMethodCalls(this.__testObj);

        wrapped.testPromiseFuncWithError()
            .catch(wrappedResult => {

                this.__testObj.testPromiseFuncWithError()
                    .catch(originalResult => {
                        expect(wrappedResult).to.eql(originalResult);
                    })

            });
    });
})