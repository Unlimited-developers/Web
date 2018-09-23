"use strict";

var mongoose = require('mongoose');

var schema = mongoose.Schema;

var mrtSchema = new schema({
    location : Object,
    name :String
});

mrtSchema.index({
    location: '2dsphere'
});

var mrtModel = mongoose.model('mrt', mrtSchema, 'mrt');

/**
 *
 * @constructor
 */
function mrt() {

}

/**
 *
 * @param query
 * @param fields
 * @param options
 * @param callback
 */
mrt.prototype.find = function (query, fields, options, callback) {
    if (!fields && !options) {
        mrtModel.find(query, callback);
    } else if (options) {
        mrtModel.find(query, fields, options, callback);
    } else {
        mrtModel.find(query, fields, callback);
    }
};

module.exports = mrt;

