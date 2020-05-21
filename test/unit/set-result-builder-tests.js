const expect = require('expect.js');
const Mocker = require('mini-mock');

const SetResultBuilder = require('../../lib/builders/set-result-builder');

describe('set-results-builder-tests', async () => {

    before('setup', async () => {
    });

    after('stop', async () => {
    });

    it('successfully builds a result', async () => {

        let expectedResult = {
            "id": 6,
            "session": {
                "id": "ba27b60a-6074-447c-ac86-024835500eb0",
                "protocol": "happn_4",
                "happn": {
                    "name": "yellowchiller_mmXZjgV87",
                    "secure": false,
                    "encryptPayloads": false,
                    "publicKey": "A1GIhy+rWxQF1SQ+W4coWSqd8YiLSYOb2QFwbbbrWi65"
                }
            },
            "request": {
                // "sessionId": "ba27b60a-6074-447c-ac86-024835500eb0",
                "data": {
                    "property1": "property1",
                    "property2": "property2",
                    "property3": "property3"
                },
                "action": "set",
                "path": "test1/testset/data",
                "options": {
                    "noPublish": false,
                    "merge": false,
                    "timeout": 60000,
                    "upsert": true
                }
            },
            "response": {
                "data": {
                    "property1": "property1",
                    "property2": "property2",
                    "property3": "property3"
                },
                "_meta": {
                    "type": "response",
                    "status": "ok",
                    "published": true,
                    "eventId": 6,
                    "sessionId": "ba27b60a-6074-447c-ac86-024835500eb0",
                    "action": "set",
                    "path": "test1/testset/data"
                }
            }
        };

        let builderResult = SetResultBuilder
            .withId(6)    // eventId
            .withSession({
                "id": "ba27b60a-6074-447c-ac86-024835500eb0",
                "protocol": "happn_4",
                "happn": {
                    "name": "yellowchiller_mmXZjgV87",
                    "secure": false,
                    "encryptPayloads": false,
                    "publicKey": "A1GIhy+rWxQF1SQ+W4coWSqd8YiLSYOb2QFwbbbrWi65"
                }
            })
            .withRequest({
                "data": {
                    "property1": "property1",
                    "property2": "property2",
                    "property3": "property3"
                },
                "action": "set",
                "path": "test1/testset/data",
                "options": {
                    "noPublish": false,
                    "merge": false,
                    "timeout": 60000,
                    "upsert": true
                }
            })
            .withResponseData({
                "property1": "property1",
                "property2": "property2",
                "property3": "property3"
            })
            .withResponseMeta({
                "type": "response",
                "status": "ok",
                "published": true,
                "eventId": 6,
                "sessionId": "ba27b60a-6074-447c-ac86-024835500eb0",
                "action": "set",
                "path": "test1/testset/data"
            })
            .build();

        expect(builderResult).to.eql(expectedResult);

    });
})