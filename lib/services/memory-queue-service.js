const EventEmitter = require('events').EventEmitter;
const shortId = require('shortid');

module.exports = class MemoryQueueService {

    constructor(config, logger) {
        this.__config = config;
        this.__logger = logger;

        /*
        this.__queue = {
            myTestQueue: {
                handler: () => { },
                items: [],
                ack: (queueItem) => { }
            },
            anotherTestQueue: {
                handler: () => { },
                items: [],
                ack: (queueItem) => { }
            }
        };
        */

        this.__queue = {};

        this.__emitter = new EventEmitter();
    }

    async initialize() {
        // this.__emitter.on('msgAdded', this.__msgAddedHandler.bind(this, eventObj));
        // this.__emitter.on('msgAcked', this.__msgAckedHandler.bind(this, eventObj));
    }

    static create(config, logger) {
        return new MemoryQueueService(config, logger);
    }

    async start() {
        this.__logger.info('---> MemoryQueueService starting....');
    }

    async startQueue(queueName) {

        let self = this;

        if (!this.__queue[queueName]) {

            this.__queue[queueName] = {
                handler: null,
                items: [],
                ack: (queueItem) => {
                    self.__msgAckedHandler(queueItem);
                }
            };
        }
    }

    getQueue(queueName) {
        return this.__queue[queueName];
    }

    // when an item has been added to the queue, we need to trigger a check to immediately call the 
    // associated handler function....
    async __msgAddedHandler(eventObj) {
        // find the right queue
        let queue = this.__queue[eventObj.queueName];

        // is the first item in the array the same as the one in the event?
        // if so, process immediately...
        if (queue.items[0].id == eventObj.id) {

            eventObj.status = 'processing';

            // invoke the handler...
            // the handler will also ack the message which will remove it from the queue
            await queue.handler(queue, eventObj);
        }
    }

    async __msgAckedHandler(eventObj) {

        // find the right queue
        let queue = this.__queue[eventObj.queueName];

        // remove the item from the end of the array
        let removed = queue.items.pop();

        // check the last item in the queue and see if can be processed....
        if (queue.items.length > 0 && queue.items[queue.items.length - 1].status != 'processing')
            await queue.handler(queue, eventObj);
    }

    async add(queueName, item) {

        try {

            let newItem = {
                id: shortId.generate(),
                queueName: queueName,
                content: item,
                status: 'new'
            };

            console.log('NEW ITEM: ', newItem);

            // add the item to the BEGINNING of the array 
            this.__queue[queueName].items.unshift(newItem);

            // notify listeners that an item has been added
            await this.__msgAddedHandler(newItem);

        } catch (err) {
            this.__logger.error('queued message failed ' + queueName + ': ' + err.message);
            throw err;
        }
    }

    async setHandler(queueName, handler) {

        // handler signature is (channel, queueItem)

        this.__logger.debug('Setting handler for queue ' + queueName);

        // we need to detect:
        // - when an item is added to  the queue
        // - is there an item currently being processed?
        // - if there is an item already in process, block this call

        try {
            let currentQueue = this.__queue[queueName];
            currentQueue.handler = handler;
        } catch (err) {
            this.__logger.error(err);
            throw err;
        } finally {

        }
    }
};
