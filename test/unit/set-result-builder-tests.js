const expect = require('expect.js');
const Mocker = require('mini-mock');

const SetResultBuilder = require('../../lib/builders/set-result-builder');

describe('set-results-builder-tests', async () => {

    before('setup', async () => {
    });

    after('stop', async () => {
    });

    it('successfully builds a result', async () => {

        let result = SetResultBuilder
            .withId('123')
            .withSession({ id: '2324' })
            .build();

        let result2 = SetResultBuilder
            .withId('0830492')
            .build();

        console.log('RESULT', result);
        console.log('RESULT 2', result2);

    });
})