const expect = require('expect.js');
const CoreRabbitService = require('../../lib/services/common/queues/core-rabbit-service');
const BroadcastQueueService = require('../../lib/services/common/queues/broadcast/rabbit-queue-service');
const AmqpClient = require('amqplib');
const { exec } = require('child_process');

describe('rabbit-topic-queue-tests', function (done) {

    this.timeout(20000);

    before('setup', async () => {

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
        this.__broadcastQueueService = BroadcastQueueService.create(this.__config, this.__logger, this.__coreRabbitService);

        await this.__coreRabbitService.initialize();
    });

    after('stop core rabbit service', async () => {
        await this.__coreRabbitService.stop();
    });

    // after('clear all queues', (done) => {

    //     exec("rabbitmqctl stop_app && rabbitmqctl reset && rabbitmqctl start_app", (err, stdout, stderr) => {
    //         if (err)
    //             done(err);

    //         console.log(stdout, stderr);

    //         done();
    //     });

    // });

    it('topic subscribers successfully receives all messages published', () => {

        return new Promise((resolve, reject) => {

            let testExchange = 'TEST_BROADCAST_EXCHANGE_1';
            
            let testQueue1 = 'BROADCAST_QUEUE_1';
            let testQueue2 = 'BROADCAST_QUEUE_2';
            let testQueue3 = 'BROADCAST_QUEUE_3';

            let testMsg1 = '{"test1":"item1"}';
            let testMsg2 = '{"test2":"item2"}';
            let testMsg3 = '{"test3":"item3"}';

            let count1 = 0;
            let count2 = 0;
            let count3 = 0;

            let checkCount = () => {
                console.log('COUNT1: ', count1);
                console.log('COUNT2: ', count2);
                console.log('COUNT3: ', count3);

                if (count1 + count2 + count3 === 9) {
                    expect(count1).to.equal(3);
                    expect(count2).to.equal(3);
                    expect(count3).to.equal(3);

                    resolve();
                }
            }

            let handler1 = (channel, msg) => {

                console.log('MESSAGE RECEIVED ON HANDLER 1: ', msg.content.toString());

                count1 += 1;
                checkCount();
            };

            let handler2 = (channel, msg) => {

                console.log('MESSAGE RECEIVED ON HANDLER 2: ', msg.content.toString());

                count2 += 1;
                checkCount();
            };

            let handler3 = (channel, msg) => {

                console.log('MESSAGE RECEIVED ON HANDLER 3: ', msg.content.toString());

                count3 += 1;
                checkCount();
            };

            try{
            this.__broadcastQueueService
                .startExchange(testExchange)
                .startQueue(testQueue1)
                .startQueue(testQueue2)
                .startQueue(testQueue3)
                .bindQueueToExchange(testQueue1, testExchange)
                .bindQueueToExchange(testQueue2, testExchange)
                .bindQueueToExchange(testQueue3, testExchange)
                .subscribe(testQueue1, handler1)
                .then(() => {
                    this.__broadcastQueueService.subscribe(testQueue2, handler2)
                        .then(() => {
                            this.__broadcastQueueService.subscribe(testQueue3, handler3)
                                .then(() => {
                                    this.__broadcastQueueService
                                        .publish(testExchange, 'BEEP.BOOP', testMsg1)
                                        .publish(testExchange, 'YADDA.YADDA.YADDA', testMsg2)
                                        .publish(testExchange, '912.8.test.abc.def.hij', testMsg3);

                                })
                        })

                })
            }catch(err){
                console.log(err);
            }
        })

    });

    // it('topic subscriber successfully receives 2 2-word messages out of 3 published', () => {

    //     return new Promise((resolve, reject) => {

    //         let testExchange = 'TEST_EXCHANGE_2';
    //         let testQueue = 'TOPIC_QUEUE_2';
    //         let key = '123.*'; // 2 words exactly; second word can be anything
    //         let testMsg = '{"test2":"item2"}';
    //         let count = 0;

    //         let handler = (channel, msg) => {

    //             count += 1;

    //             expect(msg.content.toString()).to.equal(testMsg);

    //             if (count === 2)
    //                 resolve();
    //         };

    //         this.__topicQueueService
    //             .startExchange(testExchange)
    //             .startQueue(testQueue)
    //             .bindQueueToExchange(testQueue, testExchange, key)
    //             .subscribe(testQueue, handler)
    //             .then(() => {
    //                 this.__topicQueueService
    //                     .publish(testExchange, '123.', testMsg) // yes - 2 words; second word is empty string
    //                     .publish(testExchange, '123.DABBA', testMsg)    // yes - 2 words
    //                     .publish(testExchange, '321.DABBA', testMsg);    // no - 1st word isn't a match

    //             })
    //     });
    // });

    // it('topic subscriber successfully receives 3 2-word messages out of 3 published', () => {

    //     return new Promise((resolve, reject) => {

    //         let testExchange = 'TEST_EXCHANGE_3';
    //         let testQueue = 'TOPIC_QUEUE_3';
    //         let key = '999.*'; // 2 words exactly; second word can be anything
    //         let testMsg = '{"test3":"item3"}';
    //         let count = 0;

    //         let handler = (channel, msg) => {

    //             count += 1;

    //             expect(msg.content.toString()).to.equal(testMsg);

    //             if (count === 2)
    //                 resolve();
    //         };

    //         this.__topicQueueService
    //             .startExchange(testExchange)
    //             .startQueue(testQueue)
    //             .bindQueueToExchange(testQueue, testExchange, key)
    //             .subscribe(testQueue, handler)
    //             .then(() => {
    //                 this.__topicQueueService
    //                     .publish(testExchange, '999.', testMsg) // yes - 2 words; second word is empty string
    //                     .publish(testExchange, '999.DABBA', testMsg)    // yes - 2 words
    //                     .publish(testExchange, '999.DABBA.DOO', testMsg);    // no - 3 words
    //             })
    //     });
    // });

    // it('topic subscriber successfully receives 3 2-word messages out of 3 published', () => {

    //     return new Promise((resolve, reject) => {

    //         let testExchange = 'TEST_EXCHANGE_4';
    //         let testQueue = 'TOPIC_QUEUE_4';
    //         let key = '999.#'; // any number of words; the first word must match
    //         let testMsg = '{"test3":"item3"}';
    //         let count = 0;

    //         let handler = (channel, msg) => {

    //             count += 1;

    //             expect(msg.content.toString()).to.equal(testMsg);

    //             if (count === 3)
    //                 resolve();
    //         };

    //         this.__topicQueueService
    //             .startExchange(testExchange)
    //             .startQueue(testQueue)
    //             .bindQueueToExchange(testQueue, testExchange, key)
    //             .subscribe(testQueue, handler)
    //             .then(() => {
    //                 this.__topicQueueService
    //                     .publish(testExchange, '999.', testMsg) // yes - 2 words; second word is empty string
    //                     .publish(testExchange, '999.DABBA', testMsg)    // yes - 2 words
    //                     .publish(testExchange, '999.DABBA.DOO.ANY.NUMBER.OF.WORDS', testMsg);    // no - 3 words
    //             })
    //     });
    // });

    // it('succesfully delivers message ONCE via round robin', () => {

    //     return new Promise((resolve, reject) => {

    //         let testExchange = 'TEST_EXCHANGE_5';
    //         let testQueue = 'TOPIC_QUEUE_5';
    //         let key = '912.#'; // any number of words; the first word must match
    //         let testMsg1 = '{"test1":"item1"}';
    //         let testMsg2 = '{"test2":"item2"}';
    //         let testMsg3 = '{"test3":"item3"}';

    //         let count1 = 0;
    //         let count2 = 0;
    //         let count3 = 0;

    //         let checkCount = () => {
    //             if (count1 + count2 + count3 === 3) {
    //                 expect(count1).to.equal(1);
    //                 expect(count2).to.equal(1);
    //                 expect(count3).to.equal(1);

    //                 resolve();
    //             }
    //         }

    //         let handler1 = (channel, msg) => {

    //             console.log('MESSAGE RECEIVED ON HANDLER 1: ', msg.content.toString());

    //             count1 += 1;
    //             checkCount();
    //         };

    //         let handler2 = (channel, msg) => {

    //             console.log('MESSAGE RECEIVED ON HANDLER 2: ', msg.content.toString());

    //             count2 += 1;
    //             checkCount();
    //         };

    //         let handler3 = (channel, msg) => {

    //             console.log('MESSAGE RECEIVED ON HANDLER 3: ', msg.content.toString());

    //             count3 += 1;
    //             checkCount();
    //         };

    //         this.__topicQueueService.startQueue(testQueue)
    //             .startExchange(testExchange)
    //             .bindQueueToExchange(testQueue, testExchange, key)
    //             .subscribe(testQueue, handler1)
    //             .then(() => {
    //                 this.__topicQueueService.subscribe(testQueue, handler2)
    //                     .then(() => {
    //                         this.__topicQueueService.subscribe(testQueue, handler3)
    //                             .then(() => {
    //                                 this.__topicQueueService
    //                                     .publish(testExchange, '912.9', testMsg1)
    //                                     .publish(testExchange, '912.7', testMsg2)
    //                                     .publish(testExchange, '912.8.test', testMsg3);

    //                             })
    //                     })

    //             })
    //     })
    // });
});