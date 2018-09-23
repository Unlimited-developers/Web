"use strict";

var schedule = require('node-schedule');
var moment = require('moment');
var request = require('request');
var h2p = require('html2plaintext')

var config = require('./../common/config.js');
var logger = config.logger;

var _mrtModel = require('./../models/mrt');
var mrtModel = new _mrtModel();

var job;

var _meetup = require('meetup-api')({
    key: config.meetup.key
});

var _eventModel = require('../models/event.js');
var eventModel = new _eventModel();

module.exports = () => {

    // this methos will start sync for posts at fixed interval
    function start() {
        logger.info('Sync for meetup initiated ==> ' + config.meetup.cronExpression);
        job = schedule.scheduleJob(config.meetup.cronExpression, () => {
            sync();
        })
    }

    function sync() {
        // first pull all events from api
        logger.info('Sync for meetup started');
        pullEvents()
            .then((events) => {
                // now save all events to db
                saveToDatabase(events);
            })
            .catch(err => {
                logger.error('meetup sync failed');
                logger.error(err.message);
            })
    }

    function pullEvents() {
        return new Promise((res, rej) => {
            // get all open evnt from category 6 which is education and science
            _meetup.getOpenEvents({
                // topic: 'tech,entrepreneurship',
                category: '34,2',
                country: 'sg',
                city: 'Singapore',
                fields: 'event_hosts,group_photo,group_photos',
                text_format: 'plain'
            }, function (err, d) {
                if (err) {
                    rej(err);
                } else {
                    res(d);
                }
            });
        })
    }

    // _meetup.getCategories({}, function (er, d) {
    //     console.log(er);
    //     console.log(d);
    // })

    // _meetup.findLocations({
    //     lon: 103.8385237,
    //     lat: 1.3006433
    // }, function (er, d) {
    //     console.log(d);
    // })

    async function saveToDatabase(events) {
        try {
            var _e = events;
            for (var i = 0; i < _e.results.length; i++) {
                var el = _e.results[i];
                var e = await getEventFormatted(el);
                eventModel.save({
                    id: e.id
                }, e, (err) => {
                    if (err)
                        console.log(err);
                });
            }
        } catch (e) {
            logger.error(e.message);
        }
    }


    async function getEventFormatted(e) {

        var event = {
            "id": e.id,
            "title": e.name,
            "format": e.venue ? 'offline' : 'online',
            "start": e.time,
            "end": (e.time && e.duration) ? (e.time + e.duration) : null,
            "image": e.photo_url,
            "description": {
                "text": h2p(e.description),
                "html": e.description
            },
            "type": null,
            "topic": e.group.topics ? e.group.topics.map((el) => {
                return el.name;
            }) : null,
            "isFree": e.fee ? false : true,
            "price": {
                min: null,
                max: null
            },
            "spots": null,
            "waitlist": e.waitlist_count,
            "going": e.yes_rsvp_count,
            "maybe": e.maybe_rsvp_count,
            "website": e.group ? ('https://www.meetup.com/' + e.group.urlname) : 'NA',
            "fbPage": null,
            "twitterPage": null,
            "created": e.created,
            "updated": e.updated,
            "day": parseInt(moment(e.time).format('YYYYMMDD')),
            "status": e.status,
            "url": e.event_url,
            "source": 'meetup',
            "currency": null,
            how_to_find_us: e.how_to_find_us,
            _raw: e
        };

        if (e.venue) {
            event.address = {
                "line1": e.venue.address_1,
                "line2": e.venue.address_2,
                "city": e.venue.city,
                "region": e.venue.region,
                "state": e.venue.state,
                "country": e.venue.country,
                "postal": e.venue.zip,
                name: e.venue.name
            };

            event.location = {
                type: 'Point',
                coordinates: [1 * e.venue.lon, 1 * e.venue.lat]
            };

            var mrt = await findMetro(e.venue.lat, e.venue.lon);
            if (mrt) {
                event.mrt = mrt
            }
        }

        if (e.fee) {
            event.price = {
                max: e.fee.amount,
                min: e.fee.amount
            };
            event.currency = e.fee.currency;
        }
        if (e.event_hosts) {
            event["organizer"] = [];
            e.event_hosts.forEach(function (el) {
                event["organizer"].push({
                    name: el.member_name
                })
            })
        }

        if (event.image == null) {
            if (e.group && e.group.group_photo) {
                event.image = e.group.group_photo.highres_link;
            } else if (e.group && e.group.photos && e.group.photos.length > 0) {
                event.image = e.group.photos[0].highres_link;
            } else if (e.event_hosts && e.event_hosts.length > 0) {
                var p = e.event_hosts[0].photo ? e.event_hosts[0].photo.highres_link : null;
                event.image = p;
            }
        }

        return event;
    }

    function findMetro(lat, lon) {
        return new Promise(function (res, rej) {
            var query = {
                location: {
                    $near: {
                        $geometry: {
                            type: "Point",
                            coordinates: [1 * lon, 1 * lat]
                        },
                        $maxDistance: 5000
                    }
                }
            };

            mrtModel.find(query, {
                _id: 0
            }, {}, function (err, d) {
                if (err) {
                    res({
                        name: 'NA'
                    })
                } else if (d.length == 0) {
                    res({
                        name: 'NA'
                    })
                } else {
                    res({
                        name: d[0].name
                    })
                }
            })
        })
    }

    return {
        start: start,
    }
}