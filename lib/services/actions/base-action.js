module.exports = class BaseActionService {

    constructor(queueService) {
        this.__queueService = queueService;
    }

    async process(msgObj) {
        this.__queueService.add('HAPPN_WORKER_OUT', JSON.stringify(msgObj));
    }
}