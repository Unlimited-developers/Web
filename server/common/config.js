"use strict";

var nodeEnv = process.env.NODE_ENV || 'development';

console.log("Running environment is: " + nodeEnv);

var config = {
    development: require('./dev_config'),
    production: require('./prod_config')
};

config.development.logger = require('tracer').colorConsole();
config.production.logger = require('tracer').colorConsole();

module.exports = config[nodeEnv];