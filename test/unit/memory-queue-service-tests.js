const expect = require('expect.js');
const Mocker = require('mini-mock');

const QueueService = require('../../lib/services/memory-queue-service');

describe('memory-queue-service-tests', function () {

    this.timeout(20000);

    before('setup', async () => {

        this.__mocker = new Mocker();

        this.__config = {
            happnMq: {
                queues: [
                    { name: 'HAPPN_PUBSUB_IN', type: 'pubsub_in' },
                    { name: 'HAPPN_PUBSUB_OUT', type: 'pubsub_out' },
                    { name: 'HAPPN_WORKER_IN', type: 'worker_in' },
                    { name: 'HAPPN_WORKER_OUT', type: 'worker_out' }
                ],
                queueProvider: 'rabbitmq',  // to be interchangeable with other implementations
                host: process.env['RABBITMQ_HOST'] || '0.0.0.0',
                userName: process.env['RABBITMQ_USERNAME'],
                password: process.env['RABBITMQ_PASSWORD'],
                maxReconnectDelay: 10000,
                maxReconnectRetries: 4,
                reconnectDelayAfter: 1000
            },
        };

        this.__logger = {
            info: (msg, obj) => { if (!obj) console.info(msg); else console.info(msg, obj); },
            warn: (msg, obj) => { if (!obj) console.warn(msg); else console.warn(msg, obj); },
            debug: (msg, obj) => { if (!obj) console.debug(msg); else console.debug(msg, obj) },
            error: (msg, err) => { if (!err) console.error(msg); else console.error(msg, err) }
        }
    });

    after('stop', async () => {
    });

    it('successfully add items to a queue and subsequently acknowledge them', () => {

        return new Promise((resolve, reject) => {

            let testMsg1 = { testId: '1' };
            let testMsg2 = { testId: '2' };
            let testMsg3 = { testId: '3' };
            let testMsg4 = { testId: '4' };

            let msgCount = 0;

            let testQueue = 'TEST_QUEUE';

            // the service will raise events of its own to indicate an ack - useful for tests
            let msgAckedHandler = (eventObj) => {
                msgCount += 1;

                // the ack events should have been received in order - these will therefore match the ids
                expect(eventObj.content.testId).to.equal(msgCount.toString());

                if (msgCount == 4)
                    resolve();
            };

            let setup = async () => {

                // the test message handler to bind to the queue service - this will wait 1 second after the message is popped and then ack it...
                let handler = async (channel, queueItem) => {
                    setTimeout(() => {
                        console.log('ACKING QUEUE ITEM: ', queueItem);
                        channel.ack(queueItem);
                    }, 1000)
                };

                // system under test
                let queueService = QueueService.create(this.__config.happnMq, this.__logger);
                await queueService.initialize();
                await queueService.startQueue(testQueue);
                await queueService.setHandler(testQueue, handler);
                queueService.on('msgAcked', msgAckedHandler);

                // initial assertions
                let newQueue = queueService.getQueue(testQueue);

                await queueService.add(testQueue, testMsg1);
                expect(newQueue.items.length).to.equal(1);
                expect(newQueue.items[0].content).to.equal(testMsg1);

                await queueService.add(testQueue, testMsg2);
                expect(newQueue.items.length).to.equal(2);
                expect(newQueue.items[0].content).to.equal(testMsg2);
                expect(newQueue.items[1].content).to.equal(testMsg1);

                await queueService.add(testQueue, testMsg3);
                expect(newQueue.items.length).to.equal(3);
                expect(newQueue.items[0].content).to.equal(testMsg3);
                expect(newQueue.items[1].content).to.equal(testMsg2);
                expect(newQueue.items[2].content).to.equal(testMsg1);

                await queueService.add(testQueue, testMsg4);
                expect(newQueue.items.length).to.equal(4);
                expect(newQueue.items[0].content).to.equal(testMsg4);
                expect(newQueue.items[1].content).to.equal(testMsg3);
                expect(newQueue.items[2].content).to.equal(testMsg2);
                expect(newQueue.items[3].content).to.equal(testMsg1);
            }

            setup()
                .then(() => { })
                .catch(err => {
                    return reject(err);
                });
        });
    });

})

