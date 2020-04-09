const BaseActionService = require('./base-action');

module.exports = class OffWorker extends BaseActionService {

    constructor(config, logger, queueService) {

        super(config, logger, queueService);
     }
}