const expect = require('expect.js');
const CoreRabbitService = require('../../lib/services/queues/core-rabbit-service');
const TopicQueueService = require('../../lib/services/queues/topic/rabbit-queue-service');
const AmqpClient = require('amqplib');

describe('rabbit-topic-queue-tests', async () => {

    before('setup', async () => {

        this.__exchangeName = 'MY_TEST_EXCHANGE';
        this.__queueName = 'MY_TEST_TOPIC_QUEUE';

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
        this.__topicQueueService = TopicQueueService.create(this.__config, this.__logger, this.__coreRabbitService);
        await this.__coreRabbitService.initialize();

        // // this is changed in each test
        // this.__testContext = (channel, msg) => { };

        // const handler = (channel, msg) => {
        //     // execute the test context func
        //     this.__testContext(channel, msg);
        // };

        // await this.__topicQueueService.startExchange(this.__queueName);
        // await this.__topicQueueService.setHandler(this.__queueName, handler);
    });

    after('stop', async () => {
        await this.__coreRabbitService.stop();
    });

    it('successfully starts a queue', (done) => {

        try {
            this.__topicQueueService.startExchange(this.__queueName);
            done();
        } catch (err) {
            console.log(err)
            throw err;
        }
    });

    it('successfully publishes a message', () => {

        return new Promise( (resolve, reject) => {

            let testMsg = '{"test":"item"}';

            this.__topicQueueService.startQueue(this.__queueName);
            this.__topicQueueService.startExchange(this.__exchangeName);

            let handler = (channel, msg) => {
                expect(msg.content.toString()).to.equal(testMsg);
                resolve();
            };

            this.__topicQueueService.subscribe(this.__exchangeName, this.__queueName, '*', handler);
            this.__topicQueueService.publish(this.__exchangeName, 'YADDA/TEST_KEY', testMsg);
        });

    });

})