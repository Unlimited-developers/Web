"use strict";

var router = require('express').Router()
var searchController = require('../controller/search')();

module.exports = () => {

    router.route('/')
        /**
         * Returns all events
         */
        .get(searchController.search);

    return router;
}