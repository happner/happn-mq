const EventEmitter = require('events').EventEmitter;
const shortId = require('shortid');

module.exports = class MemoryQueueService {

    constructor(config, logger) {
        this.__config = config;
        this.__logger = logger;
        this.__queue = {};
        this.__emitter = new EventEmitter();
    }

    async initialize() {
        await this.start();
    }

    on(eventType, handler) {
        return this.__emitter.on(eventType, handler);
    }

    static create(config, logger) {
        return new MemoryQueueService(config, logger);
    }

    async start() {
        this.__logger.info('---> MemoryQueueService starting....');
    }

    async startQueue(queueName) {

        /* Queue structure looks like eg:
        
        this.__queue = {
            TEST_QUEUE: {
                handler: () => { },
                items: [],
                ack: (queueItem) => { }
            },
            WORKER_QUEUE: {
                handler: () => { },
                items: [],
                ack: (queueItem) => { }
            }
        };
        
        */

        let self = this;

        if (!this.__queue[queueName]) {

            this.__queue[queueName] = {
                handler: null,
                items: [],
                ack: (msgObj) => {
                    self.__msgAckedHandler(msgObj);
                }
            };
        }
    }

    getQueue(queueName) {
        return this.__queue[queueName];
    }

    async __msgAddedHandler(msgObj) {

        // find the right queue
        let queue = this.__queue[msgObj.queueName];

        // emit an event - useful for tests
        this.__emitter.emit('msgAdded', msgObj);

        // is the first item in the array the same as the one in the event? If so, process immediately...
        if (queue.items[0].id == msgObj.id) {

            msgObj.status = 'processing';

            // invoke the handler to process and ack the message (which will remove it from the queue)
            await queue.handler(queue, msgObj);
        }
    }

    // as per a traditional queue, acking will remove the item from the queue
    async __msgAckedHandler(msgObj) {

        // find the right queue
        let queue = this.__queue[msgObj.queueName];

        // remove the item from the end of the array
        let removed = queue.items.pop();
        removed.status = 'acked';

        // emit an event - mainly used by tests
        this.__emitter.emit('msgAcked', removed);

        // check the next item in the queue and see if can be processed....
        if (queue.items.length > 0 && queue.items[queue.items.length - 1].status != 'processing')
            await queue.handler(queue, msgObj);
    }

    async add(queueName, item) {

        this.__logger.debug(`Adding message to ${queueName}...`);

        try {

            let newMsg = {
                id: shortId.generate(),
                queueName: queueName,
                content: item,
                status: 'new'
            };

            // add the item to the BEGINNING of the array 
            this.__queue[queueName].items.unshift(newMsg);

            await this.__msgAddedHandler(newMsg);

        } catch (err) {
            this.__logger.error(`Add failed for ${queueName}`, err);
            throw err;
        }
    }

    async setHandler(queueName, handler) {

        // handler signature is (channel, queueItem)

        this.__logger.debug('Setting handler for queue ' + queueName);

        try {
            let currentQueue = this.__queue[queueName];
            currentQueue.handler = handler;
        } catch (err) {
            this.__logger.error(err);
            throw err;
        }
    }
};
