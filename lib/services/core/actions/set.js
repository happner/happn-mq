const BaseActionService = require('./base-action');

module.exports = class SetActionService extends BaseActionService {

    constructor(config, logger, fifoQueueService, topicQueueService, dataService, utils, setResultBuilder) {

        super(config, logger, fifoQueueService, topicQueueService, utils);

        this.__dataService = dataService;
        this.__builder = setResultBuilder;
    }

    async process(msgObj) {

        // this.__logger.debug('processing SET: ', msgObj);

        // STEP 1: store
        let stored = await this.__dataService.processStore(msgObj);

        let resultMeta = {
            type: 'response',
            status: 'ok',   // TODO: error?
            published: !stored.request.options.noPublish,
            eventId: stored.raw.eventId,
            sessionId: stored.session.id,
            action: 'set',
            path: stored.response._meta.path
        }

        let result = this.__builder
            .withId(stored.raw.eventId)
            .withSession(stored.session)
            .withRequest(stored.request)
            .withResponseData(stored.response.data)
            .withResponseMeta(resultMeta)
            .build();

        // this.__logger.debug("'set' action result: ", result);

        // STEP 2: add to outbound queue/s
        super.process(result);
    }
}