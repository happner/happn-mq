const expect = require('expect.js');
const Happn3Harness = require('./harness');
const HappnMq = require('../../index');

describe('harness-tests', async () => {

    before('setup', async () => {
    });

    after('stop', async () => {
    });

    // afterEach('data cleanup', async () => {
    //     try {
    //         fs.unlinkSync(this.__config.data.filename); // careful!
    //     } catch (err) {
    //         console.log('No db files to clean up...');
    //     }
    // });

    it('successfully sends 2 set messages and receives responses', async () => {

        let harness = new Happn3Harness();
        await harness.initialise();

        let result1 = await harness.sendMessage('test1/testsubscribe/data/', { property1: 'property1', property2: 'property2', property3: 'property3' }, { noPublish: true, merge: false });
        console.log('RESULT 1: ', result1);

        let result2 = await harness.sendMessage('test1/testsubscribe/data/', { property4: 'property4' }, { noPublish: true, merge: true });
        console.log('RESULT 2: ', result2);

        // expect(result1).to.eql({ property1: 'property1', property2: 'property2', property3: 'property3' });
        // expect(result2).to.eql({ property4: 'property4', property1: 'property1', property2: 'property2', property3: 'property3' });

    });
})