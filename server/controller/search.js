"use strict";

var moment = require('moment');

var config = require('../common/config.js');
var logger = require('../common/config.js').logger;

var _eventModel = require('../models/event.js');
var eventModel = new _eventModel();

module.exports = () => {

    function search(req, res) {
        if (req.query.keyword == undefined) {
            res.status(404).send({
                "code": 404,
                "reason": 'Keyword Required'
            });
            return;
        }

        var keyword = req.query.keyword;

        // right now searching from only event model later it will be searched from
        // founder etc in parallel mode

        var result = {
            events: []
        };

        eventModel.find({
                title: new RegExp([keyword].join(""), "i"),
                day: {
                    $gte: parseInt(moment().format('YYYYMMDD'))
                }
            }, {
                _id: 0
            }, {
                sort: {
                    day: 1
                },
                limit : 5
            },
            function (err, data) {
                if (err) {
                    logger.error('Unbale to fetch events from db ' + err);
                    res.status(500).send({
                        "code": 500,
                        "reason": err.message
                    });
                    return;
                }

                result.events = data;
                res.send(result);
            });
    }


    return {
        search: search
    }
}