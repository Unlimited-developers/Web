"use strict";

var router = require('express').Router()
var request = require('request');

var config = require('./../common/config.js');
var _mrtModel = require('./../models/mrt');
var mrtModel = new _mrtModel();


module.exports = () => {

    router.route('/')
        /**
         * Returns all events
         */
        .get(function (req, res) {
            var lat = req.query.lat;
            var long = req.query.long;

            var query = {
                location: {
                    $near: {
                        $geometry: {
                            type: "Point",
                            coordinates: [1 * long, 1 * lat]
                        },
                        $maxDistance: 5000
                    }
                }
            };

            mrtModel.find(query, {
                _id: 0
            }, {}, function (err, d) {
                if (err) {
                    res.send({
                        name: 'NA'
                    })
                } else if (d.length == 0) {
                    res.send({
                        name: 'NA'
                    })
                } else {
                    res.send({
                        name: d[0].name
                    })
                }
            })
        });

    return router;
}