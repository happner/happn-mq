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

        const handleAcked = this.__msgAckedHandler.bind(this);

        this.__queue[queueName] = {
            handler: null,
            items: [],
            ack: (msgObj) => {
                handleAcked(msgObj);
            }
        };
    }

    getQueue(queueName) {
        return this.__queue[queueName];
    }

    async __handleMsgAdded(msgObj) {

        // find the right queue
        const queue = this.getQueue(msgObj.queueName);

        // emit an event - useful for tests
        this.__emitter.emit('msgAdded', msgObj);

        // is the last item in the array the same as the one in the event? If so, process immediately...
        if (queue.items[queue.items.length - 1].id == msgObj.id) {

            msgObj.status = 'processing';

            // invoke the handler to process and ack the message (which will remove it from the queue)
            queue.handler(queue, msgObj);
        }
    }

    // as per a traditional queue, acking will remove the item from the queue
    async __msgAckedHandler(msgObj) {

        // find the right queue
        const queue = this.getQueue(msgObj.queueName);

        // remove the item from the end of the array
        let removed = queue.items.pop();
        removed.status = 'acked';

        // emit an event - mainly used by tests
        this.__emitter.emit('msgAcked', removed);

        console.log('--> QUEUE ITEMS: ', queue.items);

        // check the next item in the queue and see if can be processed....
        if (queue.items.length > 0 && queue.items[queue.items.length - 1].status != 'processing') {
            console.log('--> PROCESSING NEXT ITEM...');
            msgObj.status = 'processing';
            queue.handler(queue, msgObj);
        }

    }

    async add(queueName, item) {

        const queue = this.getQueue(queueName);

        let newMsg = {
            id: shortId.generate(),
            queueName: queueName,
            content: item,
            status: 'new'
        };

        // add the item to the BEGINNING of the array 
        queue.items.unshift(newMsg);

        // invoke handler
        await this.__handleMsgAdded(newMsg);
    }

    setHandler(queueName, handler) {
        // handler signature is (channel, queueItem)
        let currentQueue = this.__queue[queueName];
        currentQueue.handler = handler;
    }
};
