"use strict";

var mongoose = require('mongoose');

var schema = mongoose.Schema;

var eventSchema = new schema({
    "id": {
        type: String,
        index: true
    },
    "title": {
        type: String,
        index: true
    },
    "format": String,
    "location": Object,
    "start": Date,
    "end": Date,
    "image": String,
    "description": {
        "text": String,
        "html": String
    },
    "type": String,
    "topic": Array,
    "isFree": Boolean,
    "price": {
        min: Number,
        max: Number
    },
    "spots": Number,
    "waitlist": Number,
    "going": Number,
    "maybe": Number,
    "website": String,
    "fbPage": String,
    "twitterPage": String,
    "organizer": Array,
    "created": Date,
    "updated": Date,
    "day": Number,
    "status": String,
    "url": String,
    "source": String,
    "address": {
        "line1": String,
        "line2": String,
        "city": String,
        "region": String,
        "country": String,
        "postal": String,
        "state": String,
        "name": String
    },
    "currency": String,
    "how_to_find_us": String,
    "mrt": Object,
    "ticket_classes": Array,
    "guests": Array,
    "category_id": String,
    "_raw": Object // for testing save original object will be removed in prod
}, {
    safe: true,
    strict: true
});

eventSchema.index({
    location: '2dsphere'
});

var eventModel = mongoose.model('events', eventSchema, 'events');

/**
 *
 * @constructor
 */
function event() {

}

/**
 *
 * @param data
 * @param callback
 */
event.prototype.insert = function (data, callback) {
    eventModel.create(data, callback);
};

/**
 *
 * @param query
 * @param data
 * @param callback
 */
event.prototype.save = function (query, data, callback) {
    eventModel.findOneAndUpdate(query, data, {
        upsert: true
    }, callback);
}


/**
 *
 * @param query
 * @param fields
 * @param options
 * @param callback
 */
event.prototype.find = function (query, fields, options, callback) {
    if (!fields && !options) {
        eventModel.find(query, callback);
    } else if (options) {
        eventModel.find(query, fields, options, callback);
    } else {
        eventModel.find(query, fields, callback);
    }
};

/**
 *
 * @param query
 * @param fields
 * @param callback
 */
event.prototype.findOne = function (query, fields, callback) {
    if (!fields) {
        eventModel.findOne(query, callback);
    } else {
        eventModel.findOne(query, fields, callback);
    }
};

module.exports = event;