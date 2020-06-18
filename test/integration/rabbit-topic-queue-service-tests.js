const expect = require('expect.js');
const CoreRabbitService = require('../../lib/services/queues/core-rabbit-service');
const TopicQueueService = require('../../lib/services/queues/topic/rabbit-queue-service');
const AmqpClient = require('amqplib');

describe('rabbit-topic-queue-tests', function (done) {

    this.timeout(20000);

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
    });

    before('setup exchange', async () => {
        this.__topicQueueService.startExchange(this.__exchangeName);
    });

    after('stop', async () => {
        await this.__coreRabbitService.stop();
    });

    /*
    NOTE:
    * (star) can substitute for exactly one word.
    # (hash) can substitute for zero or more words.

    - subscriptions are queue-based; publications are exchange-based (ie: can be routed to any queue depending on key)
    */


    it('topic subscriber successfully receives 1 2-word message out of 3 published', () => {

        return new Promise((resolve, reject) => {

            let testQueue = 'TOPIC_QUEUE_1';
            let key = 'YABBA.*'; // 2 words exactly; second word can be anything            
            let testMsg = '{"test":"item"}';
            let count = 0;

            let handler = (channel, msg) => {

                count += 1;

                expect(msg.content.toString()).to.equal(testMsg);

                if (count === 1)
                    resolve();
            };

            this.__topicQueueService
                .startQueue(testQueue)
                .subscribe(this.__exchangeName, testQueue, key, handler)
                .then(() => {
                    this.__topicQueueService
                        .publish(this.__exchangeName, 'YABBA', testMsg)    // no 
                        .publish(this.__exchangeName, 'YABBA.DABBA', testMsg)  // yes
                        .publish(this.__exchangeName, 'YABBA.DABBA.DOO', testMsg);  // no
                })
        })

    });

    it('topic subscriber successfully receives 2 2-word messages out of 3 published', () => {

        return new Promise((resolve, reject) => {

            let testQueue = 'TOPIC_QUEUE_2';
            let key = '123.*'; // 2 words exactly; second word can be anything
            let testMsg = '{"test2":"item2"}';
            let count = 0;

            let handler = (channel, msg) => {

                count += 1;

                expect(msg.content.toString()).to.equal(testMsg);

                if (count === 2)
                    resolve();
            };

            this.__topicQueueService
                .startQueue(testQueue)
                .subscribe(this.__exchangeName, testQueue, key, handler)
                .then(() => {
                    this.__topicQueueService
                        .publish(this.__exchangeName, '123.', testMsg) // yes - 2 words; second word is empty string
                        .publish(this.__exchangeName, '123.DABBA', testMsg)    // yes - 2 words
                        .publish(this.__exchangeName, '321.DABBA', testMsg);    // no - 1st word isn't a match

                })
        });
    });

    it('topic subscriber successfully receives 3 2-word messages out of 3 published', () => {

        return new Promise((resolve, reject) => {

            let testQueue = 'TOPIC_QUEUE_3';
            let key = '999.*'; // 2 words exactly; second word can be anything
            let testMsg = '{"test3":"item3"}';
            let count = 0;

            let handler = (channel, msg) => {

                count += 1;

                expect(msg.content.toString()).to.equal(testMsg);

                if (count === 2)
                    resolve();
            };

            this.__topicQueueService
                .startQueue(testQueue)
                .subscribe(this.__exchangeName, testQueue, key, handler)
                .then(() => {
                    this.__topicQueueService
                        .publish(this.__exchangeName, '999.', testMsg) // yes - 2 words; second word is empty string
                        .publish(this.__exchangeName, '999.DABBA', testMsg)    // yes - 2 words
                        .publish(this.__exchangeName, '999.DABBA.DOO', testMsg);    // no - 3 words
                })
        });
    });

    it('topic subscriber successfully receives 3 2-word messages out of 3 published', () => {

        return new Promise((resolve, reject) => {

            let testQueue = 'TOPIC_QUEUE_4';
            let key = '999.#'; // any number of words; the first word must match
            let testMsg = '{"test3":"item3"}';
            let count = 0;

            let handler = (channel, msg) => {

                count += 1;

                expect(msg.content.toString()).to.equal(testMsg);

                if (count === 3)
                    resolve();
            };

            this.__topicQueueService
                .startQueue(testQueue)
                .subscribe(this.__exchangeName, testQueue, key, handler)
                .then(() => {
                    this.__topicQueueService
                        .publish(this.__exchangeName, '999.', testMsg) // yes - 2 words; second word is empty string
                        .publish(this.__exchangeName, '999.DABBA', testMsg)    // yes - 2 words
                        .publish(this.__exchangeName, '999.DABBA.DOO.ANY.NUMBER.OF.WORDS', testMsg);    // no - 3 words
                })
        });
    });

    /*
    GOAL: 
    - To determine if a topic queue 
    */
    xit('succesfully delivers message ONCE via round robin', () => {

        return new Promise((resolve, reject) => {

            let testQueue = 'TOPIC_QUEUE_5';
            let key = '999.*.*'; // any number of words; the first word must match
            let testMsg1 = '{"test1":"item1"}';
            let testMsg2 = '{"test2":"item2"}';
            let testMsg3 = '{"test3":"item3"}';

            let count1 = 0;
            let count2 = 0;
            let count3 = 0;

            let handler1 = (channel, msg) => {

                console.log('MESSAGE RECEIVED ON HANDLER 1: ', msg.content.toString());

                count1 += 1;

                // expect(msg.content.toString()).to.equal(testMsg);

                // if (count === 3)
                //     resolve();
            };

            let handler2 = (channel, msg) => {

                console.log('MESSAGE RECEIVED ON HANDLER 2: ', msg.content.toString());

                count2 += 1;

                // expect(msg.content.toString()).to.equal(testMsg);

                // if (count === 3)
                //     resolve();
            };

            let handler3 = (channel, msg) => {

                console.log('MESSAGE RECEIVED ON HANDLER 3: ', msg.content.toString());

                count3 += 1;

                // expect(msg.content.toString()).to.equal(testMsg);

                // if (count === 3)
                //     resolve();
            };

            this.__topicQueueService.startQueue(testQueue)
                .subscribe(this.__exchangeName, testQueue, key, handler1)
                .then(() => {
                    this.__topicQueueService.subscribe(this.__exchangeName, testQueue, key, handler2)
                        .then(() => {
                            this.__topicQueueService.subscribe(this.__exchangeName, testQueue, key, handler3)
                                .then(() => {
                                    this.__topicQueueService.publish(this.__exchangeName, '999.9', testMsg1);
                                    this.__topicQueueService.publish(this.__exchangeName, '999.7', testMsg3);
                                    this.__topicQueueService.publish(this.__exchangeName, '999.8.test', testMsg2);

                                })
                        })

                })
        })
    });
});