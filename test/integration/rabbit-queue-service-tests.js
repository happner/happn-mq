const expect = require('expect.js');
const RabbitQueueService = require('../../lib/services/rabbit-queue-service');

describe('rabbit-queue-tests', async () => {

    before('setup', async () => {

        this.__queueName = 'MY_TEST_QUEUE';

        this.__config = {
            host: process.env['RABBITMQ_HOST'] || '0.0.0.0',
            userName: process.env['RABBITMQ_USERNAME'],
            password: process.env['RABBITMQ_PASSWORD']
        }

        this.__queueService = RabbitQueueService.create(this.__config);
    });

    after('stop', async () => {
        await this.__queueService.stop();
    });

    it('successfully creates a channel', async () => {

        try {
            await this.__queueService.initialize();
        } catch (err) {
            console.log(err)
            throw err;
        }
    });

    it('successfully starts a queue', async () => {

        try {
            await this.__queueService.initialize();
            await this.__queueService.startQueue(this.__queueName);
        } catch (err) {
            console.log(err)
            throw err;
        }
    });

    it('successfully adds and pops an item on a queue', (done) => {

        let emitter = new (require('events')).EventEmitter();

        let testMessage = JSON.stringify({ name: 'Widget' });
        // let testMessage = { name: 'Widget' };

        emitter.on('messageHandled', (msg) => {
            console.log(msg);
            expect(msg).to.equal(testMessage);
            done();
        })

        //create a queue handler
        let handler = (channel, msg) => {
            result = msg.content.toString();
            channel.ack(msg);
            emitter.emit('messageHandled', result);
        }

        let setup = async () => {
            await this.__queueService.initialize();
            await this.__queueService.startQueue(this.__queueName);
            await this.__queueService.setHandler(this.__queueName, handler);

            // add message to the queue
            await this.__queueService.add(this.__queueName, testMessage);
        }

        setup()
            .catch(err => {
                done(err);
            })
    });
})