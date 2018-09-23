"use strict";

var request = require('request');
var schedule = require('node-schedule');
var moment = require('moment');

var config = require('./../common/config.js');
var logger = config.logger;

var _mrtModel = require('./../models/mrt');
var mrtModel = new _mrtModel();

var job;

var _eventModel = require('../models/event.js');
var eventModel = new _eventModel();

module.exports = () => {

    // this methos will start sync for posts at fixed interval
    function start() {
        logger.info('Sync for evenbrite initiated ==> ' + config.evenbrite.cronExpression);
        job = schedule.scheduleJob(config.evenbrite.cronExpression, () => {
            sync();
        })
    }

    function sync(page) {
        // first pull all events from api
        logger.info('Sync for evenbrite started');

        if (page == undefined)
            page = 1;

        pullEvents(page)
            .then((events) => {
                // now save all events to db
                saveToDatabase(events, function (response) {
                    if (response.has_more_items) {
                        sync(++response.page_number);
                    }
                });
            })
            .catch(err => {
                logger.error('evenbrite sync failed');
                logger.error(err.message);
            })
    }

    function pullEvents(page) {
        return new Promise((res, rej) => {
            // get all events 
            var url = 'https://www.eventbriteapi.com/v3/events/search/?subcategories=1001%2C2002%2C2004%2C2007%2C2999&start_date.keyword=this_month&sort_by=-date&location.address=Singapore&page=' + page + '&categories=101%2C102&token=' + config.evenbrite.token;
            request.get(url, function (err, res1, body) {
                if (err)
                    rej(err);
                else
                    res(body);
            })
        })
    }

    async function saveToDatabase(events, cb) {
        try {
            var _e = JSON.parse(events);
            for (var i = 0; i < _e.events.length; i++) {
                var el = _e.events[i];
                var e = await getEventFormatted(el);
                eventModel.save({
                    id: e.id
                }, e, (err) => {
                    if (err)
                        console.log(err);
                });
            }
            cb(_e.pagination);
        } catch (e) {
            logger.error(e.message);
        }
    }


    async function getEventFormatted(e) {
        var organizer;
        var venue;
        var format;
        var pricing;
        if (e.organizer_id)
            organizer = await getOrganizer(e.organizer_id);
        if (e.venue_id)
            venue = await getVenue(e.venue_id);
        if (e.format_id)
            format = await getFormat(e.format_id);
        if (e.id)
            pricing = await getPricing(e.id);

        var event = {
            "id": e.id,
            "title": e.name.text,
            "format": e.online_event ? 'online' : 'offline',
            "location": null,
            "start": e.start.utc,
            "end": e.end.utc,
            "image": e.logo ? e.logo.url : null,
            "description": {
                "text": e.description.text,
                "html": e.description.html
            },
            "topic": null,
            "isFree": e.is_free,
            "price": {
                min: null,
                max: null
            }, // work on it
            "spots": e.quantity_total,
            "waitlist": e.quantity_sold > e.quantity_total ? (e.quantity_sold - e.quantity_total) : 0,
            "going": null,
            "maybe": null,
            "website": 'https://www.eventbrite.com/',
            "source": "eventbrite",
            "created": e.created,
            "updated": e.changed,
            "day": parseInt(moment(e.start.utc).format('YYYYMMDD')),
            "status": e.status,
            "url": e.url,
            "currency": e.currency,
            "_raw": e
        }

        if (organizer) {
            organizer = JSON.parse(organizer);
            event.fbPage = organizer.facebook;
            event.twitterPage = organizer.twitter;
            event.instaPage = organizer.instagram;
            event.organizer = [{
                "name": organizer.name,
                "email": null,
                "phone": null,
                "description": organizer.description.text
            }];
            event.website = organizer.url;
        }

        if (venue) {
            venue = JSON.parse(venue);
            event.location = {
                type: "Point",
                coordinates: [1 * venue.address.longitude, 1 * venue.address.latitude]
            };
            event.address = {
                "line1": venue.address.address_1,
                "line2": venue.address.address_2,
                "city": venue.address.city,
                "region": venue.address.region,
                "country": venue.address.country,
                "postal": venue.address.postal_code,
                "state": venue.address.state,
                "name": venue.name
            }

            var mrt = await findMetro(venue.address.latitude, venue.address.longitude);
            if (mrt) {
                event.mrt = mrt;
            }
        }

        if (format) {
            format = JSON.parse(format);
            event.type = format.short_name;
        }

        if (pricing) {
            pricing = JSON.parse(pricing);
            event.ticket_classes = pricing.ticket_classes;
            event.price = {
                max: 0,
                min: 0
            };

            event.ticket_classes.forEach(function (el, i) {
                if (el.free) {
                    event.price.max = 0;
                    event.price.min = 0;
                } else {
                    if (i == 0) {
                        event.price.max = el.cost.value / 100;
                        event.price.min = el.cost.value / 100;
                    } else {
                        if (el.cost.value < event.price.min)
                            event.price.min = el.cost.value / 100;
                        if (el.cost.value > event.price.max)
                            event.price.max = el.cost.value / 100;
                    }
                }
            })
        }
        return event;
    }

    function getOrganizer(id) {
        return new Promise(function (res, rej) {
            request.get('https://www.eventbriteapi.com/v3/organizers/' + id + '/?token=' + config.evenbrite.token, function (err, res1, body) {
                if (err)
                    res(false);
                else
                    res(body);
            })
        })
    }

    function getVenue(id) {
        return new Promise(function (res, rej) {
            request.get('https://www.eventbriteapi.com/v3/venues/' + id + '/?token=' + config.evenbrite.token, function (err, res1, body) {
                if (err)
                    res(false);
                else
                    res(body);
            })
        })
    }

    function getFormat(id) {
        return new Promise(function (res, rej) {
            request.get('https://www.eventbriteapi.com/v3/formats/' + id + '/?token=' + config.evenbrite.token, function (err, res1, body) {
                if (err)
                    res(false);
                else
                    res(body);
            })
        })
    }

    function getPricing(id) {
        return new Promise(function (res, rej) {
            request.get('https://www.eventbriteapi.com/v3/events/' + id + '/ticket_classes/?token=' + config.evenbrite.token, function (err, res1, body) {
                if (err)
                    res(false);
                else
                    res(body);
            })
        })
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