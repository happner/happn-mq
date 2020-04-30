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

        // let result = {
        //     id: msgObj.raw.eventId,
        //     session: msgObj.session,
        //     request: msgObj.raw,
        //     response: {
        //         data: msgObj.raw.data,
        //         _meta: {
        //             type: 'response',
        //             status: 'ok',
        //             published: false,
        //             eventId: msgObj.raw.eventId,
        //             sessionId: msgObj.raw.sessionId,
        //             action: 'set'
        //         }
        //     }
        // };

        let meta = {
            type: 'response',
            status: 'ok',
            published: !stored.request.options.noPublish,
            eventId: stored.raw.eventId,
            sessionId: stored.session.id,
            action: 'set'
        }

        let result = builder
            .withId(stored.raw.eventId)
            .withSession(stored.session)
            .withRequest(stored.request)
            .withResponseData(stored.response.data)
            .withResponseMeta(meta)
            .build();

        // this.__logger.debug("'set' action result: ", result);

        // STEP 2: publish (via outbound pubsub queue)
        super.process(result);
    }
}