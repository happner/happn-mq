module.exports = class SessionProxy {

    constructor() { }

    static create() {
        return new SessionProxy();
    }
    
    process() {
        console.log('process called....')
    }
}