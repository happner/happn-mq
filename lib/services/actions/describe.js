const BaseActionService = require('./base-action');

module.exports = class DescribeActionService extends BaseActionService {

    constructor(config, logger, queueService, utils) {
        super(config, logger, queueService, utils);
    }

    async process(msgObj) {

        // SAMPLE: 

        // {
        //     "session": {
        //         "id": "7c1fea4f-1f14-40f1-a39b-00f469a03d00",
        //         "protocol": "happn_4",
        //         "happn": {
        //             "name": "voidferret_XRzXb8ejo",
        //             "secure": false,
        //             "encryptPayloads": false,
        //             "publicKey": "AhEPwvOAms3fADkGxyaxfcnniPFilxeHjqVXlcq1aqz9"
        //         }
        //     },
        //     "id": 2,
        //     "request": {
        //         "action": "describe",
        //         "eventId": 2,
        //         "data": null
        //     },
        //     "response": {
        //         "data": {
        //             "name": "voidferret_XRzXb8ejo",
        //             "secure": false,
        //             "encryptPayloads": false,
        //             "publicKey": "AhEPwvOAms3fADkGxyaxfcnniPFilxeHjqVXlcq1aqz9"
        //         },
        //         "_meta": {
        //             "type": "response",
        //             "status": "ok",
        //             "published": false,
        //             "eventId": 2,
        //             "action": "describe"
        //         },
        //         "protocol": "happn_4",
        //         "__outbound": true
        //     }
        // }

        let result = {
            id: msgObj.raw.eventId,
            session: msgObj.session,
            request: msgObj.raw,
            response: {
                data: msgObj.session,
                _meta: {
                    type: 'response',
                    status: 'ok',
                    published: false,
                    eventId: msgObj.raw.eventId,
                    action: 'describe'
                }
            }
        };

        //process
        // this.__logger.debug(`'DESCRIBE' ACTION PROCESSED!`);
        super.process(result);
    }
}