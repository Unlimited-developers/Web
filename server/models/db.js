"use strict";

var mongoose = require('mongoose');
var logger = require('../common/config.js').logger;

/**
 * Initialize the db object with a connection URL, based on the incoming parameters
 *
 * @param dbName
 * @param host
 * @param port
 * @param username
 * @param password
 * @constructor
 */
var DB = function (dbName, host, port, username, password) {
    this.connectionUrl = getConnectionUrl(dbName, host, port, username, password);
};

/**
 * Connect to MongoDB
 *
 * @param callback - callback(err)
 */
DB.prototype.connect = function (callback) {
    mongoose.connect(this.connectionUrl, {
        useNewUrlParser: true
    });

    mongoose.connection.once('connected', function () {
        callback(null);
    });

    mongoose.connection.once('error', callback);
    setupMongooseEvents();
};


/**
 * Create mongo connection string
 *
 * @param dbName
 * @param host
 * @param port
 * @param username
 * @param password
 * @returns {string}
 */

function getConnectionUrl(dbName, host, port, username, password) {
    var connectionUrl = "mongodb://";
    if (username.length > 0 && password.length > 0)
        connectionUrl += username + ":" + password + "@";
    connectionUrl += host + ":" + port + "/" + dbName;
    return connectionUrl;
}

/**
 * Sets up events that may occur during db connection
 * Also sets up a callback for process termination event in order to close the db if that happens
 */
function setupMongooseEvents() {
    mongoose.connection.on('connected', function () {
        logger.info('Connected to db');
    });

    mongoose.connection.on('error', function (err) {
        logger.error('Mongoose connection error:', err);
    });

    mongoose.connection.on('disconnected', function () {
        logger.warn("Mongoose disconnected");
    });

    process.on('SIGINT', function () {
        mongoose.connection.close(function () {
            logger.warn('Mongoose disconnected through app termination');
            process.exit(0);
        });
    });
}

module.exports = DB;