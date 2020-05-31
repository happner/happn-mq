const fs = require('fs');
const Xpozr = require('xpozr');
const expect = require('expect.js');
const AmqpClient = require('amqplib');
const { v4: uuidv4 } = require('uuid');
const Nedb = require('happn-nedb');
const RabbitQueueService = require('../../lib/services/queues/fifo/rabbit-queue-service');
// const MemoryQueueService = require('../../lib/services/queues/fifo/memory-queue-service');
const RouterService = require('../../lib/services/router-service');
const SecurityService = require('../../lib/services/security-service');
const ActionServiceFactory = require('../../lib/factories/action-service-factory');
const NedbDataService = require('../../lib/services/data/nedb-data-service');
const NedbRepository = require('../../lib/repositories/nedb-repository')
const Utils = require('../../lib/utils/utils');
const upsertBuilder = require('../../lib/builders/upsert-builder');

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
        // this.__queueService = tracer.trace(RabbitQueueService.create(this.__config, this.__logger, AmqpClient));
        this.__queueService = RabbitQueueService.create(this.__config, this.__logger, AmqpClient);
        // this.__queueService = MemoryQueueService.create(this.__config, this.__logger, AmqpClient);
        await this.__queueService.initialize();

        // security service
        this.__securityService = SecurityService.create(this.__config, this.__logger);

        // nedb
        let nedb = new Nedb(this.__config.data);
        let nedbRepository = NedbRepository.create(nedb);
        // this.__dataService = tracer.trace(NedbDataService.create(this.__config, this.__logger, nedb, this.__utils));
        this.__dataService = NedbDataService.create(this.__config, this.__logger, nedbRepository, this.__utils, upsertBuilder);

        // actions
        // let setAction = tracer.trace(new (require(`../../lib/services/actions/set`))(this.__config, this.__logger, this.__queueService, this.__dataService, this.__utils));
        let setAction = new (require(`../../lib/services/actions/set`))(this.__config, this.__logger, this.__queueService, this.__dataService, this.__utils);
        this.__actions = { setAction };

        // action factory
        this.__actionServiceFactory = ActionServiceFactory.create(this.__config, this.__logger, this.__actions);

        // start the queues
        for (let queue of this.__config.queues) {
            this.__queueService.startQueue(queue.name);
        }

        // SYSTEM UNDER TEST
        // this.__routerService = tracer.trace(RouterService.create(this.__config, this.__logger, this.__queueService, this.__securityService, this.__actionServiceFactory));
        this.__routerService = RouterService.create(this.__config, this.__logger, this.__queueService, this.__securityService, this.__actionServiceFactory);
        await this.__routerService.start();

    });

    // comment this out if you want to see the test DB file
    afterEach('data cleanup', async () => {
        try {
            fs.unlinkSync(this.__config.data.filename); // careful!
        } catch (err) {
            console.log('No db files to clean up...');
        }
    });

    after('stop', async () => {
        await this.__queueService.stop();
    });

    afterEach('listener cleanup', async () => {
        this.__queueService.removeAllListeners('itemAdded');
    });

    it('successfully handles SET message on inbound queue and adds response to outbound queue', (done) => {

        let testData = {
            property1: 'property1',
            property2: 'property2',
            property3: 'property3'
        };

        // test SET message
        let testMsg = getBaseSetMsg(testData);

        this.__queueService.on('itemAdded', (eventObj) => {

            console.log('RESULT: ', eventObj.item);

            if (eventObj.queueName === 'HAPPN_WORKER_OUT') {
                let outboundMsg = eventObj.item;
                expect(outboundMsg.response.data).to.eql(testData);
                done();
            }
        })

        // add this to the inbound queue
        this.__queueService.add('HAPPN_WORKER_IN', testMsg);

    });

    // creates an initial record; then merges a second record with the first one
    it('successfully handles a SET message with MERGE option', (done) => {

        // initial 

        let initialData = {
            property1: 'property1',
            property2: 'property2',
            property3: 'property3'
        };

        let initialMsg = getBaseSetMsg(initialData);

        // final

        let finalData = {
            property4: 'property4'
        };

        let finalMsg = getBaseSetMsg(finalData, false, false, true, false);

        // expectations

        let expectedResponseData = {
            property1: 'property1',
            property2: 'property2',
            property3: 'property3',
            property4: 'property4'
        };

        let msgCount = 0;

        this.__queueService.on('itemAdded', (eventObj) => {

            if (eventObj.queueName === 'HAPPN_WORKER_OUT') {

                msgCount += 1;

                if (msgCount === 2) {

                    console.log('RESULT: ', eventObj.item);

                    let outboundMsg = eventObj.item;
                    expect(outboundMsg.response.data).to.eql(expectedResponseData);
                    done();
                }
            }
        })

        this.__queueService.add('HAPPN_WORKER_IN', initialMsg);
        this.__queueService.add('HAPPN_WORKER_IN', finalMsg);
    });

    // creates an initial record; then adds additional record on same path as sibling
    it('successfully handles a SET message in the same session with SIBLING option', (done) => {

        // initial 

        let initialData = {
            property1: 'property1',
            property2: 'property2',
            property3: 'property3'
        };

        let initialMsg = getBaseSetMsg(initialData);

        // final

        let finalData = {
            property5: 'property5'
        };

        let finalMsg = getBaseSetMsg(finalData, false, false, false, true);

        // expectations

        let expectedResponseData = {
            property5: 'property5'
        };

        let msgCount = 0;

        this.__queueService.on('itemAdded', (eventObj) => {

            if (eventObj.queueName === 'HAPPN_WORKER_OUT') {

                msgCount += 1;

                if (msgCount === 2) {
                    let outboundMsg = eventObj.item;

                    console.log('RESULT: ', outboundMsg);

                    expect(outboundMsg.response.data).to.eql(expectedResponseData);

                    // check that the path has been appended with a random id
                    let pathLen = finalMsg.raw.path.split('/').length;
                    let storedPathLen = outboundMsg.response._meta.path.split('/').length;
                    expect(storedPathLen).to.equal(pathLen + 1);

                    done();
                }
            }
        })

        this.__queueService.add('HAPPN_WORKER_IN', initialMsg);
        this.__queueService.add('HAPPN_WORKER_IN', finalMsg);
    });

    // TODO - look at the happn-3 process of handling tags (there is a LOT more to this!):
    // processStore -> upsert -> __upsertInternal -> insertTag
    xit('successfully handles a SET message with TAG option', (done) => {

        // initial 

        let initialData = {
            property1: 'property1',
            property2: 'property2',
            property3: 'property3'
        };

        let initialMsg = getBaseSetMsg(initialData);

        // final

        let finalMsg = getBaseSetMsg(null, false, false, false, false, true);

        console.log('FINAL MESSAGE: ', finalMsg)

        let msgCount = 0;

        this.__queueService.on('itemAdded', (eventObj) => {

            if (eventObj.queueName === 'HAPPN_WORKER_OUT') {

                msgCount += 1;

                if (msgCount === 2) {
                    let outboundMsg = eventObj.item;

                    console.log('RESULT: ', outboundMsg);

                    // expect(outboundMsg.response.data).to.eql(expectedResponseData);

                    done();
                }
            }
        })

        this.__queueService.add('HAPPN_WORKER_IN', initialMsg);
        this.__queueService.add('HAPPN_WORKER_IN', finalMsg);
    });

    it('successfully handles a SET message and publishes on the pubsub queue', (done) => {

        // initial 

        let initialData = {
            property1: 'property1',
            property2: 'property2',
            property3: 'property3'
        };

        let initialMsg = getBaseSetMsg(initialData, false, true, false, false);

        this.__queueService.on('itemAdded', (eventObj) => {

            if (eventObj.queueName === 'HAPPN_PUBSUB_OUT') {

                let outboundMsg = eventObj.item;

                expect(outboundMsg.response.data).to.eql(initialData);

                done();
            }
        })

        this.__queueService.add('HAPPN_WORKER_IN', initialMsg);
    });

    /*
     HELPERS
     */

    function getBaseSetMsg(data, isNewSession = false, isPublish = false, isMerge = false, isSibling = false, isTag = false) {

        let uuid = isNewSession ? uuidv4() : 'ba27b60a-6074-447c-ac86-024835500eb0';

        let options = {
            noPublish: !isPublish,
            merge: isMerge,
            timeout: 60000
        };

        if (isSibling) {
            options.set_type = 'sibling';
        }

        if (isTag) {
            options.tag = 'test_tag'
        }

        let raw = {
            action: 'set',
            eventId: 6,
            path: 'test1/testset/data',
            sessionId: uuid,
            options: options
        }

        let request = {
            sessionId: uuid
        }

        if (!isTag) {
            raw.data = data;
            request.data = data;
        }

        return {
            raw: raw,
            session: {
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
            request: request
        }
    }
})



