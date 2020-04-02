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

    it('successfully starts a queue', () => {

        let testMsg1 = { testId: '1' };
        let testMsg2 = { testId: '2' };
        let testMsg3 = { testId: '3' };
        let testMsg4 = { testId: '4' };

        let handler = async (channel, queueItem) => {

            console.log('CHANNEL: ', channel);

            setTimeout(() => {
                console.log('ACKING QUEUE ITEM: ', queueItem);
                channel.ack(queueItem);

                let content = queueItem.content;

                if (content.testId == '1') {
                    expect(channel.items.length).to.equal(3);
                    expect(channel.items[0].content).to.equal(testMsg4);
                    expect(channel.items[1].content).to.equal(testMsg3);
                    expect(channel.items[2].content).to.equal(testMsg2);
                }

                if (content.testId == '4') {
                    expect(channel.items.length).to.equal(0);
                }


            }, 1000)

        };

        let wait = async () => {

            // system under test
            const queueService = QueueService.create(this.__config.happnMq, this.__logger);
            await queueService.initialize();
            await queueService.startQueue('TEST_QUEUE');

            let newQueue = queueService.getQueue('TEST_QUEUE');

            await queueService.setHandler('TEST_QUEUE', handler);

            await queueService.add('TEST_QUEUE', testMsg1);
            expect(newQueue.items.length).to.equal(1);
            expect(newQueue.items[0].content).to.equal(testMsg1);

            await queueService.add('TEST_QUEUE', testMsg2);
            expect(newQueue.items.length).to.equal(2);
            expect(newQueue.items[0].content).to.equal(testMsg2);
            expect(newQueue.items[1].content).to.equal(testMsg1);

            await queueService.add('TEST_QUEUE', testMsg3);
            expect(newQueue.items.length).to.equal(3);
            expect(newQueue.items[0].content).to.equal(testMsg3);
            expect(newQueue.items[1].content).to.equal(testMsg2);
            expect(newQueue.items[2].content).to.equal(testMsg1);

            await queueService.add('TEST_QUEUE', testMsg4);
            expect(newQueue.items.length).to.equal(4);
            expect(newQueue.items[0].content).to.equal(testMsg4);
            expect(newQueue.items[1].content).to.equal(testMsg3);
            expect(newQueue.items[2].content).to.equal(testMsg2);
            expect(newQueue.items[3].content).to.equal(testMsg1);
        }

        wait();

    });

})

