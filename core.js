
const QueueServiceProvider = require('./lib/providers/queue-service-provider');
const SecurityService = require('./lib/services/security-service');
const DataService = require('./lib/services/data-service');
const RouterService = require('./lib/services/router-service');
const ActionServiceFactory = require('./lib/factories/action-service-factory');

// The main entry point
module.exports = class Core {

    // TODO - use constructor injection...
    constructor() {

        this.__config = {

            happnMq: {
                queues: [
                    { name: 'HAPPN_PUBSUB_IN', type: 'pubsub_in' },
                    { name: 'HAPPN_PUBSUB_OUT', type: 'pubsub_out' },
                    { name: 'HAPPN_WORKER_IN', type: 'worker_in' },
                    { name: 'HAPPN_WORKER_OUT', type: 'worker_out' }
                ],
                queueProvider: 'rabbitmq',  // to be interchangeable with other implementations, eg: rabbitmq, memory
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
        let queueProvider = QueueServiceProvider.create(this.__config.happnMq, this.__logger);
        this.__queueService = queueProvider.getQueueService();
        this.__securityService = SecurityService.create();
        this.__dataService = DataService.create();
        this.__actionServiceFactory = ActionServiceFactory.create(this.__logger, this.__securityService, this.__queueService, this.__dataService);
        this.__routerService = RouterService.create(this.__config.happnMq, this.__logger, this.__queueService, this.__securityService, this.__actionServiceFactory);
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

    // this is invoked by happn-3's session service 
    async processInboundMessage(msg) {
        console.log('Adding to inbound queue.....');
        await this.__queueService.add('HAPPN_WORKER_IN', msg);
    }

    // set by happn-3 so that the session service can respond to the client
    async setOutboundWorkerQueueHandler(handler) {
        console.log('Binding handler to outbound worker queue.....');
        let queueName = this.__findQueueNameByType('worker_out');
        await this.__queueService.setHandler(queueName, handler);
    }

    // set by happn-3 so that the session service can respond to the client
    async setOutboundPubsubQueueHandler(handler) {
        console.log('Binding handler to outbound pubsub queue.....');
        let queueName = this.__findQueueNameByType('pubsub_out');
        await this.__queueService.setHandler(queueName, handler);
    }

    __findQueueNameByType(type) {
        return this.__config.happnMq.queues.find(queue => {
            return queue.type == type;
        }).name;
    }
}