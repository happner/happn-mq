
const Nedb = require('happn-nedb');
const Utils = require('./lib/utils/utils');
const QueueServiceProvider = require('./lib/providers/queue-service-provider');
const SecurityService = require('./lib/services/security-service');
const DataServiceProvider = require('./lib/providers/data-service-provider');
const DataService = require('./lib/services/nedb-data-service');
const RouterService = require('./lib/services/router-service');
const ActionServiceFactory = require('./lib/factories/action-service-factory');

// The main entry point
module.exports = class Core {

    // TODO - use constructor injection...
    constructor() {

        this.__config = {
            happnMq: {
                trace: true,
                queues: [
                    { name: 'HAPPN_PUBSUB_IN', type: 'pubsub_in' },
                    { name: 'HAPPN_PUBSUB_OUT', type: 'pubsub_out' },
                    { name: 'HAPPN_WORKER_IN', type: 'worker_in' },
                    { name: 'HAPPN_WORKER_OUT', type: 'worker_out' }
                ],
                queueProvider: 'rabbitmq',  // to be interchangeable with other implementations, eg: rabbitmq, memory
                data: {
                    provider: 'nedb',
                    filename: 'happn-mq-TEST',
                    autoload: true,
                    timestampData: true
                },
                host: process.env['RABBITMQ_HOST'] || '0.0.0.0',
                userName: process.env['RABBITMQ_USERNAME'],
                password: process.env['RABBITMQ_PASSWORD']
            }
        };

        this.__logger = {
            info: (msg, obj) => { if (!obj) console.info(msg); else console.info(msg, obj); },
            warn: (msg, obj) => { if (!obj) console.warn(msg); else console.warn(msg, obj); },
            debug: (msg, obj) => { if (!obj) console.debug(msg); else console.debug(msg, obj) },
            error: (msg, err) => { if (!err) console.error(msg); else console.error(msg, err) }
        }

        // these dependencies will be handled by DI
        this.__utils = Utils.create();
        this.__nedb = new Nedb(this.__config.happnMq.data);
        this.__nedbDataService = this.__setupTracing(DataService.create(this.__config, this.__logger, this.__nedb, this.__utils));
        this.__queueProvider = this.__setupTracing(QueueServiceProvider.create(this.__config.happnMq, this.__logger));
        this.__dataServiceProvider = this.__setupTracing(DataServiceProvider.create(this.__config.happnMq, this.__logger, this.__nedbDataService, this.__utils));
        this.__queueService = this.__setupTracing(this.__queueProvider.getQueueService());
        this.__dataService = this.__setupTracing(this.__dataServiceProvider.getDataService());
        this.__securityService = this.__setupTracing(SecurityService.create(this.__config.happnMq, this.__logger));

        // actions
        let describeAction = this.__setupTracing(new (require('./lib/services/actions/describe'))(this.__config, this.__logger, this.__queueService, this.__utils));
        let loginAction = this.__setupTracing(new (require(`./lib/services/actions/login`))(this.__config, this.__logger, this.__queueService, this.__securityService, this.__utils));
        let getAction = this.__setupTracing(new (require(`./lib/services/actions/get`))(this.__config, this.__logger, this.__queueService, this.__utils));
        let offAction = this.__setupTracing(new (require(`./lib/services/actions/off`))(this.__config, this.__logger, this.__queueService, this.__utils));
        let onAction = this.__setupTracing(new (require(`./lib/services/actions/on`))(this.__config, this.__logger, this.__queueService, this.__utils));
        let removeAction = this.__setupTracing(new (require(`./lib/services/actions/remove`))(this.__config, this.__logger, this.__queueService, this.__utils));
        let setAction = this.__setupTracing(new (require(`./lib/services/actions/set`))(this.__config, this.__logger, this.__queueService, this.__dataService, this.__utils));

        this.__actions = {
            describeAction, loginAction, getAction, offAction, onAction, removeAction, setAction
        }

        this.__actionServiceFactory = ActionServiceFactory.create(this.__config, this.__logger, this.__actions);
        this.__routerService = this.__setupTracing(RouterService.create(this.__config.happnMq, this.__logger, this.__queueService, this.__securityService, this.__actionServiceFactory));
    }

    static create() {
        return new Core();
    }

    async initialize() {

        this.__logger.info('Initializing core.....');

        // set up the queue service
        await this.__queueService.initialize();

        // start the queues
        for (let queue of this.__config.happnMq.queues) {
            this.__queueService.startQueue(queue.name);
        };

        // set up the router service
        await this.__routerService.start();
    }

    __setupTracing(obj) {
        if (this.__config.happnMq.trace)
            return this.__utils.traceMethodCalls(obj);

        return obj;
    }

    // this is invoked by happn-3's session service 
    async processInboundMessage(msg) {
        // console.log('Adding to inbound queue.....');
        await this.__queueService.add('HAPPN_WORKER_IN', msg);
    }

    // set by happn-3 so that the session service can respond to the client
    async setOutboundWorkerQueueHandler(handler) {
        // console.log('Binding handler to outbound worker queue.....');
        let queueName = this.__findQueueNameByType('worker_out');
        await this.__queueService.setHandler(queueName, handler);
    }

    // set by happn-3 so that the session service can respond to the client
    async setOutboundPubsubQueueHandler(handler) {
        // console.log('Binding handler to outbound pubsub queue.....');
        let queueName = this.__findQueueNameByType('pubsub_out');
        await this.__queueService.setHandler(queueName, handler);
    }

    __findQueueNameByType(type) {
        return this.__config.happnMq.queues.find(queue => {
            return queue.type == type;
        }).name;
    }
}