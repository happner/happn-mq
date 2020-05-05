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
})