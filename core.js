
const Xpozr = require('xpozr');
const Nedb = require('happn-nedb');
const AmqpClient = require('amqplib');
const Utils = require('./lib/utils/utils');
const CoreRabbitService = require('./lib/services/queues/core-rabbit-service');
const QueueServiceFactory = require('./lib/factories/queue-service-factory');
const SecurityService = require('./lib/services/security-service');
const DataServiceFactory = require('./lib/factories/data-service-factory');
const DataService = require('./lib/services/data/nedb-data-service');
const NedbRepository = require('./lib/repositories/nedb-repository');
const RouterService = require('./lib/services/router-service');
const ActionServiceFactory = require('./lib/factories/action-service-factory');
const setResultBuilder = require('./lib/builders/set-result-builder');
const upsertBuilder = require('./lib/builders/upsert-builder');

// The main entry point
module.exports = class Core {

    // TODO - use constructor injection...
    constructor(config) {

        // defaults if the config is null
        // this.__config = config ? config : {
        //     trace: true,
        //     queues: [
        //         // { name: 'HAPPN_PUBSUB_IN', type: 'pubsub_in' },
        //         { name: 'HAPPN_PUBSUB_OUT', type: 'pubsub_out' },
        //         { name: 'HAPPN_WORKER_IN', type: 'worker_in' },
        //         { name: 'HAPPN_WORKER_OUT', type: 'worker_out' }
        //     ],
        //     queueProvider: 'rabbitmq',  // to be interchangeable with other implementations, eg: rabbitmq, memory
        //     data: {
        //         provider: 'nedb',
        //         filename: 'happn-MQ',
        //         autoload: true,
        //         timestampData: true
        //     },
        //     host: process.env['RABBITMQ_HOST'] || '0.0.0.0',
        //     userName: process.env['RABBITMQ_USERNAME'],
        //     password: process.env['RABBITMQ_PASSWORD']
        // };

        this.__config = config;

        console.log('HAPPN-MQ CONFIG: ', this.__config);

        this.__logger = {
            info: (msg, obj) => { if (!obj) console.info(msg); else console.info(msg, obj); },
            warn: (msg, obj) => { if (!obj) console.warn(msg); else console.warn(msg, obj); },
            debug: (msg, obj) => { if (!obj) console.debug(msg); else console.debug(msg, obj) },
            error: (msg, err) => { if (!err) console.error(msg); else console.error(msg, err) }
        }

        this.__xpozr = new Xpozr();

        // these dependencies will be handled by DI
        this.__utils = Utils.create();
        this.__nedb = new Nedb(this.__config.data);

        // this.__nedbDataService = this.__setupTracing(DataService.create(this.__config, this.__logger, this.__nedb, this.__utils));
        this.__nedbRepository = NedbRepository.create(this.__nedb);
        this.__nedbDataService = DataService.create(this.__config, this.__logger, this.__nedbRepository, this.__utils, upsertBuilder);
        this.__dataServiceFactory = DataServiceFactory.create(this.__config, this.__logger, this.__nedbDataService, this.__utils);
        this.__coreRabbitService = CoreRabbitService.create(this.__config, this.__logger, AmqpClient);
        this.__queueServiceFactory = QueueServiceFactory.create(this.__config, this.__logger, this.__coreRabbitService);
        this.__fifoQueueService = this.__queueServiceFactory.getFifoQueueService();
        this.__topicQueueService = this.__queueServiceFactory.getTopicQueueService();
        this.__dataService = this.__dataServiceFactory.getDataService();
        this.__securityService = SecurityService.create(this.__config, this.__logger);

        // actions
        let describeAction = new (require('./lib/services/actions/describe'))(this.__config, this.__logger, this.__fifoQueueService, this.__utils);
        let loginAction = new (require(`./lib/services/actions/login`))(this.__config, this.__logger, this.__fifoQueueService, this.__securityService, this.__utils);
        let getAction = new (require(`./lib/services/actions/get`))(this.__config, this.__logger, this.__fifoQueueService, this.__utils);
        let offAction = new (require(`./lib/services/actions/off`))(this.__config, this.__logger, this.__fifoQueueService, this.__utils);
        let onAction = new (require(`./lib/services/actions/on`))(this.__config, this.__logger, this.__fifoQueueService, this.__utils);
        let removeAction = new (require(`./lib/services/actions/remove`))(this.__config, this.__logger, this.__fifoQueueService, this.__utils);
        // let setAction = new (require(`./lib/services/actions/set`))(this.__config, this.__logger, this.__fifoQueueService, this.__dataService, this.__utils);
        let setAction = new (require(`./lib/services/actions/set`))(this.__config, this.__logger, this.__fifoQueueService, this.__topicQueueService, this.__dataService, this.__utils);

        this.__actions = {
            describeAction, loginAction, getAction, offAction, onAction, removeAction, setAction
        }

        this.__actionServiceFactory = ActionServiceFactory.create(this.__config, this.__logger, this.__actions);
        // this.__routerService = this.__setupTracing(RouterService.create(this.__config.happnMq, this.__logger, this.__queueService, this.__securityService, this.__actionServiceFactory));
        this.__routerService = RouterService.create(this.__config.happnMq, this.__logger, this.__fifoQueueService, this.__securityService, this.__actionServiceFactory);
    }

    static create(config) {
        return new Core(config);
    }

    async initialize() {

        this.__logger.info('Initializing core.....');

        // set up the queue service
        await this.__coreRabbitService.initialize();

        // for (let queue of this.__config.queues) {
        //     this.__fifoQueueService.startQueue(queue.name);
        // }

        // start the inbound and outbound fifo queues
        this.__fifoQueueService.startQueue('HAPPN_WORKER_IN');
        this.__fifoQueueService.startQueue('HAPPN_WORKER_OUT');

        // set up the main outbound topic queue
        this.__topicQueueService.startExchange('HAPPN-MQ-CORE');
        this.__topicQueueService.startQueue('HAPPN_PUBSUB_OUT');

        // set up the router service
        await this.__routerService.start();
    }

    __setupTracing(obj) {
        if (this.__config.trace)
            return this.__xpozr.trace(obj);

        return obj;
    }

    // this is invoked by happn-3's session service 
    async processInboundMessage(msg) {
        // console.log('Adding to inbound queue.....');
        await this.__fifoQueueService.add('HAPPN_WORKER_IN', msg);
    }

    // set by happn-3 so that the session service can respond to the client
    async setOutboundWorkerQueueHandler(handler) {
        // console.log('Binding handler to outbound worker queue.....');
        let queueName = this.__findQueueNameByType('worker_out');
        console.log('OUTBOUND QUEUE: ', queueName);
        await this.__fifoQueueService.setHandler(queueName, handler);
    }

    // set by happn-3 so that the session service can respond to the client
    // async setOutboundPubsubQueueHandler(handler) {
    //     // console.log('Binding handler to outbound pubsub queue.....');
    //     let queueName = this.__findQueueNameByType('pubsub_out');
    //     await this.__fifoQueueService.setHandler(queueName, handler);
    // }
    
    async subscribe(key, handler) {
        await this.__topicQueueService.subscribe('HAPPN-MQ-CORE', 'HAPPN_PUBSUB_OUT', key, handler);
    }

    __findQueueNameByType(type) {
        return this.__config.queues.find(queue => {
            return queue.type === type;
        }).name;
    }
}