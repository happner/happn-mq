const expect = require('expect.js');
const CoreRabbitService = require('../../lib/services/queues/core-rabbit-service');
const RabbitQueueService = require('../../lib/services/queues/fifo/rabbit-queue-service');
const AmqpClient = require('amqplib');

describe('rabbit-fifo-queue-tests', async () => {

    before('setup', async () => {

        this.__queueName = 'MY_TEST_QUEUE';

        this.__config = {
            host: process.env['RABBITMQ_HOST'] || '0.0.0.0',
            userName: process.env['RABBITMQ_USERNAME'],
            password: process.env['RABBITMQ_PASSWORD']
        }

        this.__logger = {
            info: (msg, obj) => { if (!obj) console.info(msg); else console.info(msg, obj); },
            warn: (msg, obj) => { if (!obj) console.warn(msg); else console.warn(msg, obj); },
            debug: (msg, obj) => { if (!obj) console.debug(msg); else console.debug(msg, obj) },
            error: (msg, err) => { if (!err) console.error(msg); else console.error(msg, err) }
        }

        //config, logger, amqpClient
        this.__coreRabbitService = CoreRabbitService.create(this.__config, this.__logger, AmqpClient);
        this.__queueService = RabbitQueueService.create(this.__config, this.__logger, this.__coreRabbitService);
        await this.__coreRabbitService.initialize();

        // this is changed in each test
        this.__testContext = (channel, msg) => { };

        const handler = (channel, msg) => {
            // execute the test context func
            this.__testContext(channel, msg);
        };

        await this.__queueService.startQueue(this.__queueName);
        await this.__queueService.setHandler(this.__queueName, handler);
    });

    after('stop', async () => {
        await this.__coreRabbitService.stop();
    });

    it('successfully adds and pops an item on a queue', (done) => {

        let testMessage = JSON.stringify({ name: 'Widget' });

        this.__testContext = (channel, msg) => {

            let result = msg.content.toString();

            try {
                expect(result).to.equal(testMessage);
            } finally {
                channel.ack(msg);
                done();
            }
        }

        this.__queueService.add(this.__queueName, testMessage);

    });

    it('successfully pops items in the correct sequence', (done) => {

        let testMessage1 = JSON.stringify({ name: 'Widget1' });
        let testMessage2 = JSON.stringify({ name: 'Widget2' });

        let msgCount = 0;

        this.__testContext = (channel, msg) => {

            msgCount += 1;

            let result = msg.content.toString();

            try {
                switch (msgCount) {
                    case 1:
                        expect(result).to.equal(testMessage1);
                        break;
                    case 2:
                        expect(result).to.equal(testMessage2);
                        break;
                    default:
                }
            } finally {
                channel.ack(msg);

                if (msgCount === 2)
                    done();
            }
        }

        this.__queueService.add(this.__queueName, testMessage1);
        this.__queueService.add(this.__queueName, testMessage2);

    });
})