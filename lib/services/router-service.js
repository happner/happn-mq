
module.exports = class RouterService {

    constructor(config, queueService, securityService, actionServiceFactory) {
        this.__config = config;
        this.__queueService = queueService;
        this.__securityService = securityService;
        this.__actionServiceFactory = actionServiceFactory;
    }

    async initialize() {

    }

    static create(config, queueService, workerFactory, actionServiceFactory) {
        return new RouterService(config, queueService, workerFactory, actionServiceFactory);
    }

    async start() {
        // TODO: dynamically bind a handler per queue defined in the config 
        await this.__queueService.setHandler('HAPPN_WORKER_IN', this.queueItemHandler.bind(this));
    }

    // the main function where the queued item is popped and a decision is made what to do with it...
    async queueItemHandler(channel, queueItem) {

        if (!queueItem)
            return;

        let msg = queueItem.content;
        let msgObj = JSON.parse(msg);

        console.log('HANDLING MESSAGE ACTION: ', msgObj.raw.action);

        // FIRST DO THE AUTHORIZATION...
        let authorized = await this.__securityService.processAuthorize(msgObj);

        let actionService = null;

        // NOW WE CAN HANDLE THE SPECIFIC ACTION
        switch (authorized.request.action) {

            case 'describe':
                console.log('DESCRIBING!');
                actionService = this.__actionServiceFactory.getActionService('describe');
                break;
            case 'login':
                console.log('LOGIN!');
                actionService = this.__actionServiceFactory.getActionService('login');
                break;
            case 'on':
                console.log('ON!');
                actionService = this.__actionServiceFactory.getActionService('on');
                break;
            case 'off':
                break;
            case 'set':
                console.log('SETTING DATA!');
                actionService = this.__actionServiceFactory.getActionService('set');
                break;
            case 'get':
                break;
            case 'remove':
                break;
            case 'count':
                break;
            case 'request-nonce':
                break;
            case 'ack':
                break;
            case 'revoke-token':
                break;
            case 'disconnect-child-sessions':
                break;
            default:
                break;
        }

        try {
            // action service implementation will handle adding to response queue where necessary
            await actionService.process(authorized);
        } finally {
            channel.ack(queueItem);
        }

    }

}