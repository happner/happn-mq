const BaseActionService = require('./base-action');

module.exports = class LoginActionService extends BaseActionService {

    constructor(config, logger, queueService, securityService, utils) {
        super(config, logger, queueService, utils);
        this.__securityService = securityService;
    }

    async process(msgObj) {

        let loginResult = await this.__securityService.processLogin(msgObj);

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
        //         },
        //         "info": {
        //             "_browser": false,
        //             "_local": false
        //         }
        //     },
        //     "id": 3,
        //     "request": {
        //         "action": "login",
        //         "eventId": 3,
        //         "data": {
        //             "info": {
        //                 "_browser": false,
        //                 "_local": false
        //             },
        //             "protocol": "happn_4"
        //         },
        //         "options": {
        //             "timeout": 60000
        //         }
        //     },
        //     "response": {
        //         "data": {
        //             "id": "7c1fea4f-1f14-40f1-a39b-00f469a03d00",
        //             "protocol": "happn_4",
        //             "happn": {
        //                 "name": "voidferret_XRzXb8ejo",
        //                 "secure": false,
        //                 "encryptPayloads": false,
        //                 "publicKey": "AhEPwvOAms3fADkGxyaxfcnniPFilxeHjqVXlcq1aqz9"
        //             },
        //             "info": {
        //                 "_browser": false,
        //                 "_local": false
        //             }
        //         },
        //         "_meta": {
        //             "type": "response",
        //             "status": "ok",
        //             "published": false,
        //             "eventId": 3,
        //             "action": "login"
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
                    action: 'login'
                }
            }
        };

        // let result = resultBuilder
        //     .withId(id)
        //     .withSessionId(sessionId)
        //     .withRequest(request)
        //     .build();

        //process
        // this.__logger.debug(`'LOGIN' ACTION PROCESSED!`);
        super.process(result);
    }
}