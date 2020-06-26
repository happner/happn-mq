module.exports = class MemoryQueueService {

    constructor(tameSearch) {
        this.__tameSearch = tameSearch;
    }

    create(tameSearch) {
        return new MemoryQueueService(tameSearch);
    }

    /*
    What needs to happen here?

    - Once an action service has handled a message, it then (based on the presence of 'noPublish:false') needs to:
        - 1. find the subscribers to the path of the message (using tame-search). These subscribers will be instances of happn-mq BOUNDARY (which
            will in turn manage their own client subscriptions)
        - 2. the client (BOUNDARY instance) socket connections that need to be 

    */
}