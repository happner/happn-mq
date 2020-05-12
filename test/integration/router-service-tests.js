const fs = require('fs');
const Xpozr = require('xpozr');
const expect = require('expect.js');
const AmqpClient = require('amqplib');
const { v4: uuidv4 } = require('uuid');
const Nedb = require('happn-nedb');
const RabbitQueueService = require('../../lib/services/rabbit-queue-service');
const RouterService = require('../../lib/services/router-service');
const SecurityService = require('../../lib/services/security-service');
const ActionServiceFactory = require('../../lib/factories/action-service-factory');
const NedbDataService = require('../../lib/services/nedb-data-service');
const Utils = require('../../lib/utils/utils');

describe('router-service-tests', (done) => {

    before('setup', async () => {

        let tracer = new Xpozr();

        this.__config = {
            host: process.env['RABBITMQ_HOST'] || '0.0.0.0',
            userName: process.env['RABBITMQ_USERNAME'],
            password: process.env['RABBITMQ_PASSWORD'],
            queues: [
                { name: 'HAPPN_PUBSUB_OUT', type: 'pubsub_out' },
                { name: 'HAPPN_WORKER_IN', type: 'worker_in' },
                { name: 'HAPPN_WORKER_OUT', type: 'worker_out' }
            ],
            queueProvider: 'rabbitmq',
            data: {
                provider: 'nedb',
                filename: `${__dirname}/happn-mq-ROUTER-TEST`,
                autoload: true,
                timestampData: true
            }
        }

        this.__logger = {
            info: (msg, obj) => { if (!obj) console.info(msg); else console.info(msg, obj); },
            warn: (msg, obj) => { if (!obj) console.warn(msg); else console.warn(msg, obj); },
            debug: (msg, obj) => { if (!obj) console.debug(msg); else console.debug(msg, obj) },
            error: (msg, err) => { if (!err) console.error(msg); else console.error(msg, err) }
        }

        this.__utils = Utils.create();

        // queue service
        this.__queueService = RabbitQueueService.create(this.__config, this.__logger, AmqpClient);
        await this.__queueService.initialize();

        // security service
        this.__securityService = SecurityService.create(this.__config, this.__logger);

        // nedb
        let nedb = new Nedb(this.__config.data);
        // this.__dataService = tracer.trace(NedbDataService.create(this.__config, this.__logger, nedb, this.__utils));
        this.__dataService = NedbDataService.create(this.__config, this.__logger, nedb, this.__utils);

        // actions
        let setAction = new (require(`../../lib/services/actions/set`))(this.__config, this.__logger, this.__queueService, this.__dataService, this.__utils);
        this.__actions = { setAction };

        // action factory
        this.__actionServiceFactory = ActionServiceFactory.create(this.__config, this.__logger, this.__actions);

        // start the queues
        for (let queue of this.__config.queues) {
            this.__queueService.startQueue(queue.name);
        }

        // system under test
        this.__routerService = RouterService.create(this.__config, this.__logger, this.__queueService, this.__securityService, this.__actionServiceFactory);
        await this.__routerService.start();

        // each test will have it's own expectations function which is executed by the handler
        this.__executeExpectations = null;

        // the outbound queue handler
        this.__outboundHandler = (channel, queueItem) => {

            if (!queueItem)
                return done(new Error('Queue item is empty'))

            try {
                let outboundMsg = queueItem.content;
                let msgObj = JSON.parse(outboundMsg);

                this.__executeExpectations(msgObj);
            } finally {
                channel.ack(queueItem);
            }
        }

        this.__queueService.setHandler('HAPPN_WORKER_OUT', this.__outboundHandler);

    });

    after('stop', async () => {
        await this.__queueService.stop();

        // careful!
        fs.unlinkSync(this.__config.data.filename);
    });

    it('successfully handles a SET message', (done) => {

        let testData = {
            property1: 'property1',
            property2: 'property2',
            property3: 'property3'
        };

        // test SET message
        let testMsg = getBaseSetMsg(false, testData);

        this.__executeExpectations = (msgObj) => {
            expect(msgObj.response.data).to.eql(testData);
            done();
        }

        // add this to the inbound queue
        this.__queueService.add('HAPPN_WORKER_IN', testMsg);

    });

    // depends on the previous test to do the initial SET
    it('successfully handles a SET message in the same session with MERGE option', (done) => {

        let testData = {
            property4: 'property4'
        };

        // test SET message
        let testMsg = getBaseSetMsg(false, testData, true);

        let expectedData = {
            property1: 'property1',
            property2: 'property2',
            property3: 'property3',
            property4: 'property4'
        };

        this.__executeExpectations = (msgObj) => {
            expect(msgObj.response.data).to.eql(expectedData);
            done();
        }

        // add this to the inbound queue
        this.__queueService.add('HAPPN_WORKER_IN', testMsg);
    });

    /*
     HELPERS
     */

    function getBaseSetMsg(newSession, data, merge) {

        let uuid = newSession ? uuidv4() : 'ba27b60a-6074-447c-ac86-024835500eb0';

        return {
            raw:
            {
                action: 'set',
                eventId: 6,
                path: 'test1/testsubscribe/data/',
                data: data,
                sessionId: uuid,
                options: { noPublish: true, merge: merge, timeout: 60000 }
            },
            session:
            {
                id: uuid,
                protocol: 'happn_4',
                happn:
                {
                    name: 'yellowchiller_mmXZjgV87',
                    secure: false,
                    encryptPayloads: false,
                    publicKey: 'A1GIhy+rWxQF1SQ+W4coWSqd8YiLSYOb2QFwbbbrWi65'
                }
            },
            id: 6,
            request:
            {
                sessionId: uuid,
                data: data
            }
        }
    }

})



