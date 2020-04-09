const BaseActionService = require('./base-action');

module.exports = class OnActionService extends BaseActionService {

    constructor(config, logger, queueService) {
        super(config, logger, queueService);
    }

    async process(msgObj) {

        // {
        //     "session": {
        //         "id": "7c1fea4f-1f14-40f1-a39b-00f469a03d00",
        //         "protocol": "happn_4",
        //         "happn": {
        //             "name": "voidferret_XRzXb8ejo",
        //             "secure": false,
        //             "encryptPayloads": false,
        //             "publicKey": "AhEPwvOAms3fADkGxyaxfcnniPFilxeHjqVXlcq1aqz9"
        //         },
        //         "info": {
        //             "_browser": false,
        //             "_local": false
        //         }
        //     },
        //     "id": 4,
        //     "request": {
        //         "action": "on",
        //         "eventId": 4,
        //         "path": "/ALL@*",
        //         "data": null,
        //         "sessionId": "7c1fea4f-1f14-40f1-a39b-00f469a03d00",
        //         "options": {
        //             "event_type": "all",
        //             "count": 0,
        //             "timeout": 60000
        //         },
        //         "pathData": {
        //             "parts": [
        //                 "/ALL",
        //                 "*"
        //             ],
        //             "action": "ALL"
        //         },
        //         "key": "*"
        //     },
        //     "response": {
        //         "data": {
        //             "id": "S-Dm_gZvTcio2OvJoQuukA-0"
        //         },
        //         "_meta": {
        //             "status": "ok",
        //             "type": "response",
        //             "published": false,
        //             "eventId": 4,
        //             "sessionId": "7c1fea4f-1f14-40f1-a39b-00f469a03d00",
        //             "action": "on"
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
                    sessionId: msgObj.raw.sessionId,
                    action: 'on'
                }
            }
        };

        //process
        this.__logger.debug(`'ON' ACTION PROCESSED!`);
        super.process(result);
    }
}