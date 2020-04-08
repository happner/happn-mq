const BaseActionService = require('./base-action');

module.exports = class SetActionService extends BaseActionService {

    constructor(securityService, queueService, dataService) {

        super(queueService);
        this.__securityService = securityService;
        this.__dataService = dataService;
    }

    async process(msgObj) {

        // set the data on the data service
        await this.__dataService.set(msgObj.request.data);

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
        //     "id": 5,
        //     "request": {
        //         "action": "set",
        //         "eventId": 5,
        //         "path": "test1/testsubscribe/data/",
        //         "data": {
        //             "property1": "property1",
        //             "property2": "property2",
        //             "property3": "property3"
        //         },
        //         "sessionId": "7c1fea4f-1f14-40f1-a39b-00f469a03d00",
        //         "options": {
        //             "noPublish": true,
        //             "timeout": 60000,
        //             "upsert": true
        //         }
        //     },
        //     "response": {
        //         "data": {
        //             "property1": "property1",
        //             "property2": "property2",
        //             "property3": "property3"
        //         },
        //         "_meta": {
        //             "created": 1584639463915,
        //             "modified": 1584639463915,
        //             "path": "test1/testsubscribe/data/",
        //             "type": "response",
        //             "status": "ok",
        //             "published": false,
        //             "eventId": 5,
        //             "sessionId": "7c1fea4f-1f14-40f1-a39b-00f469a03d00",
        //             "action": "set"
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
                data: msgObj.raw.data,
                _meta: {
                    type: 'response',
                    status: 'ok',
                    published: false,
                    eventId: msgObj.raw.eventId,
                    sessionId: msgObj.raw.sessionId,
                    action: 'set'
                }
            }
        };

        //process
        console.log('SET PROCESSED!');
        super.process(result);
    }
}