
module.exports = class RouterService {

    constructor(config, logger, queueService, securityService, actionServiceFactory) {
        this.__config = config;
        this.__logger = logger;
        this.__queueService = queueService;
        this.__securityService = securityService;
        this.__actionServiceFactory = actionServiceFactory;
    }

    async initialize() {

    }

    static create(config, logger, queueService, workerFactory, actionServiceFactory) {
        return new RouterService(config, logger, queueService, workerFactory, actionServiceFactory);
    }

    start() {
        this.__logger.info('---> starting RouterService...');
        this.__queueService.setHandler('HAPPN_WORKER_IN', this.queueItemHandler.bind(this));
    }

    // the main function where the queued item is popped and a decision is made what to do with it...
    async queueItemHandler(channel, queueItem) {

        if (!queueItem)
            return;

        let msg = queueItem.content;

        // the message will be a buffer if the queue is Rabbit; otherwise it will be an object....

        let msgObj = (msg instanceof Buffer || msg instanceof String) ? JSON.parse(msg) : msg;

        this.__logger.debug('--> handling message action: ', msgObj.raw.action);

        try {
            // authorize
            let authorizedMsg = await this.__securityService.processAuthorize(msgObj);

            // get the relevant action service
            let actionService = this.__actionServiceFactory.getActionService(authorizedMsg.request.action);

            // action service implementation will handle adding to response queue where necessary
            await actionService.process(authorizedMsg);
        } catch (err) {
            this.__logger.error('queueItemHandler', err);
        } finally {
            this.__logger.debug('--> acking message');
            channel.ack(queueItem);
        }
    }
}