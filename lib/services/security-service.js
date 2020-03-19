module.exports = class SecurityService {
    constructor() { }

    static create() {
        return new SecurityService();
    }

    async processAuthorize(msgObj) {
        console.log('AUTHORIZING....');
        msgObj.request = {
            action: msgObj.raw.action
        };
        console.log('AUTHORIZATION RESULT: ', msgObj);
        return msgObj;
    }

    async processLogin(msgObj) {
        console.log('LOGGING IN....');

        // TODO: authentication logic
        return true;
    }
}