const EventEmitter = require('events').EventEmitter;

module.exports = class BaseQueueService {

    constructor() { 
        this.__emitter = new EventEmitter();
    }

    emit(eventType, eventObj){
        this.__emitter.emit('serviceStarted', {});
    }

    on(eventType, handler) {
        return this.__emitter.on(eventType, handler);
    }

    removeListener(eventType, handler) {
        return this.__emitter.removeListener(eventType, handler);
    }

    removeAllListeners(eventType) {
        return this.__emitter.removeAllListeners(eventType);
    }
}