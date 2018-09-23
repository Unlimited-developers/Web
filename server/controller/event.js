"use strict";

var moment = require('moment');

var config = require('../common/config.js');
var logger = require('../common/config.js').logger;

var _eventModel = require('../models/event.js');
var eventModel = new _eventModel();


module.exports = () => {

    function findAll(req, res) {

        var externalQuery = JSON.parse(req.query.query);

        var page = externalQuery.page || 1;
        delete externalQuery.page;

        var query = queryBuilder(externalQuery);

        if(query.day == undefined){
            query.day = {
                $gte : parseInt(moment().format('YYYYMMDD'))
            }
        }

        logger.info(JSON.stringify(query));
        
        eventModel.find(query, {
                _id: 0
            }, {
                sort: {
                    day: 1,
                    source : 1
                },
                skip: (page - 1) * config.eventPerPage,
                limit: config.eventPerPage
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

                if (data.length == 0) {
                    res.status(404).send({
                        "code": 404,
                        "reason": 'No Data'
                    });
                    return;
                }

                res.send(data);
            })
    }

    /*
     * Format External  Query to Internal format
     */
    function queryBuilder(q) {
        var query = {};
        for (var key in q) {
            switch (key) {
                case 'type':
                    if (q[key] != 'any')
                        query['type'] = new RegExp([q[key]].join(""), "i");
                    break;
                case 'format':
                    if (q[key] != 'any')
                        query['format'] = new RegExp([q[key]].join(""), "i");
                    break;
                case 'subject':
                    if (q[key].length > 0)
                        query['topic'] = {
                            $in: q[key]
                        };
                    break;
                case 'day':
                    if (q[key].start != null && q[key].end != null)
                        query['day'] = {
                            $gte: q[key].start,
                            $lte: q[key].end
                        };
                    break;
                case 'distance':
                    if (q['location'].lat != null && q['location'].long != null)
                        query['location'] = {
                            $near: {
                                $geometry: {
                                    type: "Point",
                                    coordinates: [1 * q['location'].long, 1 * q['location'].lat]
                                },
                                $maxDistance: q['distance'] * 1000
                            }
                        };
                
                    // not usingg because this query because of development purpose
                    // events are from diffrent country and i am in diffrent
                    // so i can not set that much location :-)
                    break;
            }
        }
        console.log(query);
        return query;
    }

    return {
        findAll: findAll
    }
}