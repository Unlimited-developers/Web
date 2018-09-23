"use strict";

var router = require('express').Router()
var eventController = require('../controller/event')();

module.exports = () => {

    router.route('/')
        /**
         * Returns all events
         */
        .get(eventController.findAll);

    return router;
}