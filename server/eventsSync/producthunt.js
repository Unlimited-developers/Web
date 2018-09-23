"use strict";

var productHuntAPI = require('producthunt');
var schedule = require('node-schedule');
var moment = require('moment');


var config = require('./../common/config.js');
var logger = config.logger;

var _eventModel = require('../models/event.js');
var eventModel = new _eventModel();


var job;

module.exports = () => {

    // this methos will start sync for posts at fixed interval
    function start() {
        logger.info('Sync for producthunt initiated ==> ' + config.producthunt.cronExpression);
        job = schedule.scheduleJob(config.producthunt.cronExpression, () => {
            sync();
        })
    }


    function sync(offset) {
        // first pull all events from api

        if (offset == undefined)
            offset = 0;

        logger.info('Sync for producthunt started');
        pullEvents(offset)
            .then((events) => {
                // now save all events to db
                saveToDatabase(events, offset, function (more, off) {
                    if (more) {
                        sync(off + 20);
                    }
                });
            })
            .catch(err => {
                logger.error('producthunt sync failed');
                logger.error(err.message);
            })
    }

    function pullEvents(offset) {
        return new Promise((res, rej) => {

            var productHunt = new productHuntAPI({
                client_id: config.producthunt.clientId,
                client_secret: config.producthunt.clientSecret,
                grant_type: 'client_credentials'
            });

            // List all live events
            productHunt.live.index({
                    newer: moment().format('YYYY-MM-DD'),
                    search: {
                        category: 'tech'
                    },
                    per_page: 20,
                    offset: offset
                },
                function (err, res1) {
                    if (err) {
                        rej(err);
                    } else
                        res(res1.body);
                })
        })
    }

    async function saveToDatabase(events, offset, cb) {
        try {
            var _e = JSON.parse(events);
            for (var i = 0; i < _e.live_events.length; i++) {
                var el = _e.live_events[i];
                var e = await getEventFormatted(el);
                eventModel.save({
                    id: e.id
                }, e, (err) => {
                    if (err)
                        console.log(err);
                });
            }
            if (_e.live_events.length == 20) {
                cb(true, offset)
            } else
                cb(false);
        } catch (e) {
            logger.error(e.message);
        }
    }

    function getEventFormatted(e) {

        var event = {
            "id": e.id,
            "title": e.name,
            "format": 'online',
            "location": {
                type: 'Point',
                coordinates: [0, 0]
            },
            "start": e.starts_at,
            "end": e.ends_at,
            "image": e.background_image_url,
            "description": {
                "text": e.tagline,
                "html": e.tagline
            },
            "type": null,
            "topic": null,
            "isFree": true,
            "price": {
                min: null,
                max: null
            },
            "spots": null,
            "waitlist": null,
            "going": e.subscriber_count,
            "maybe": null,
            "website": 'https://www.producthunt.com',
            "fbPage": e.facebook_username,
            "twitterPage": e.twitter_username,
            "organizer": null,
            "created": null,
            "updated": null,
            "day": e.starts_at ? parseInt(moment(e.starts_at, 'YYYY-MM-DD').format('YYYYMMDD')) : null,
            "status": 'live',
            "url": e.url,
            "source": 'producthunt',
            "address": null,
            "currency": null,
            "guests": e.guests,
            "category_id": e.category_id,
            "_raw": e
        };
        return event;
    }

    return {
        start: start
    }
}