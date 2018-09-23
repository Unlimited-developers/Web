"use strict";

var express = require('express'),
    bodyParser = require('body-parser'),
    compression = require('compression'),
    morgan = require('morgan');

var config = require('./common/config.js'),
    DB = require('./models/db.js'),
    eventSync = require('./eventsSync');

var logger = config.logger;

var database = new DB(config.db.name, config.db.host, config.db.port, config.db.username, config.db.password);


database.connect(function (err) {
    if (!err) {
        // start cron jobs and server
        eventSync();
        init();
    } else {
        logger.error('DB error: ', err);
        throw err;
    }
});


function init() {

    // initialize all routes
    var event = require('./routes/event.js');
    var search = require('./routes/search.js');
    var location = require('./routes/location.js');

    var app = express();

    // app settings
    app.disable('x-powered-by');

    /**
     * CORS support.
     * http://enable-cors.org/server_expressjs.html
     */
    var allowCrossDomain = function (req, res, next) {
        res.header('Access-Control-Allow-Origin', "*");
        res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, PUT");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, api_key, api_key_1, api_key_2, c-v-hash");
        res.header("Content-Type", "application/json; charset=utf-8");
        if ('OPTIONS' == req.method) {
            res.sendStatus(200);
        } else {
            next();
        }
    };



    // Middleware setup in express
    app.set('port', process.env.PORT || config.port);
    app.use(compression({
        threshold: 512
    })); // Compress everything above 512 bytes
    app.use(morgan('dev'));
    app.use(bodyParser.json({
        limit: '16kb'
    })); // Maximum incoming json data is 16kb
    app.use(bodyParser.urlencoded({
        extended: true,
        limit: '16kb'
    })); // Maximum incoming url encoded data is 16kb

    /**
     * CORS support.
     */
    app.all('*', allowCrossDomain);

    // define all routes
    app.get('/', function (req, res) {
        res.send('Server is running');
    });
    
    app.use('/event', event());
    app.use('/search', search());
    app.use('/location', location());
    
    app.listen(app.get('port'), function () {
        logger.info("Server started on port: " + app.get('port'));
    });
}