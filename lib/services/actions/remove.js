const BaseActionService = require('./base-action');

module.exports = class RemoveActionService extends BaseActionService {

    constructor(config, logger, queueService) {
        super(config, logger, queueService);
    }
}