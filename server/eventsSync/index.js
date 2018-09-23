"use strict";


var config = require('./../common/config.js');
var logger = config.logger;


var producthunt = require('./producthunt')();
var meetup = require('./meetup')();
var evenbrite = require('./evenbrite')();


/**
 * Starts all the cron jobs
 */
module.exports = () => {
    logger.info('Starting all sync events');
    // start all sync
    producthunt.start();
    meetup.start();
    evenbrite.start();
}
