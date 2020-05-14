const BaseActionService = require('./base-action');
const builder = require('../../builders/set-result-builder');

module.exports = class SetActionService extends BaseActionService {

    constructor(config, logger, queueService, dataService, utils) {

        super(config, logger, queueService, utils);

        this.__dataService = dataService;
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

        let result = builder
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