const BaseActionService = require('./base-action');

module.exports = class GetActionService extends BaseActionService {

    constructor(config, logger, queueService, utils) { 
        super(config, logger, queueService, utils);
    }
}