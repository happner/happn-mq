const BaseActionService = require('./base-action');
const builder = require('../../builders/set-result-builder');

module.exports = class SetActionService extends BaseActionService {

    constructor(config, logger, queueService, dataService) {

        super(config, logger, queueService);

        this.__dataService = dataService;
    }

    async process(msgObj) {

        this.__logger.debug('processing SET: ', msgObj);

        // set the data on the data service
        let stored = await this.__dataService.processStore(msgObj);

        // STEP 1: store
        // STEP 2: publish (via outbound pubsub queue)

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

        let result = builder
            .withId(msgObj.raw.eventId)
            .withSession(msgObj.session)
            .withRequest(msgObj.raw)
            .withResponseData(msgObj.raw.data)
            .withResponseMeta(msgObj.raw.data)
            .build();

            console.log(result);

        //process
        this.__logger.debug(`'SET' ACTION PROCESSED!`);

        super.process(result);
    }
}