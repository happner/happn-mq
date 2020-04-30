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
            testAsyncFunc: async () => {
                return {
                    testField: 'testValue2'
                }
            },
            testPromiseFunc: () => {
                return new Promise((resolve, reject) => {
                    resolve({
                        testField: 'testValue3'
                    })
                })
            }
        }
    });

    after('stop', async () => {
    });

    it('successfully wraps functions', async () => {

        let utils = Utils.create();

        let wrapped = utils.traceMethodCalls(this.__testObj);

        let result1 = wrapped.testSyncFunc();
        console.log('RESULT 1: ', result1);

        let result2 = await wrapped.testAsyncFunc();
        console.log('RESULT 2: ', result2);

        wrapped.testPromiseFunc()
            .then(result => {
                console.log('RESULT 3: ', result);
            });
    });
})