module.exports = class DataService {

    constructor() { }

    static create() {
        return new DataService();
    }

    async upsert() {
        console.log('upsert data called....')
    }

    async get() {
        console.log('get data called....')
    }
    
    async set(data) {
        console.log('set data called....')
    }
}