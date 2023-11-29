
/*
  This module contains a function called 'isfLookup' intended to lookup and calculate the insulin sensitivity factor (ISF) at a given timestamp within a provided dataset of ISF schedules. The ISF determines how much one unit of insulin will typically lower blood glucose.

  The 'isfLookup' function performs the following tasks:
  - Accepts ISF data, a timestamp, and an optional last result object as input parameters.
  - Determines the current time if a timestamp is not provided and calculates the current time in minutes since midnight.
  - Checks if the last result exists and if the current time falls within the previously calculated offset and endOffset.
  - Sorts the ISF schedule data by offset.
  - Identifies the ISF schedule applicable for the given timestamp based on offset times.
  - Returns the calculated insulin sensitivity and updates the lastResult object with the relevant ISF schedule and its endOffset.

  The code also defines an 'isfLookup' property within the 'isfLookup' function itself for potential internal referencing, and exports the 'isfLookup' function for external use.
*/




'use strict';

var _ = require('lodash');

function isfLookup(isf_data, timestamp, lastResult) {

    var nowDate = timestamp;

    if (typeof(timestamp) === 'undefined') {
        nowDate = new Date();
    }

    var nowMinutes = nowDate.getHours() * 60 + nowDate.getMinutes();

    if (lastResult && nowMinutes >= lastResult.offset && nowMinutes < lastResult.endOffset) {
        return [lastResult.sensitivity, lastResult];
    }

    isf_data = _.sortBy(isf_data.sensitivities, function(o) { return o.offset; });

    var isfSchedule = isf_data[isf_data.length - 1];

    if (isf_data[0].offset !== 0) {
        return [-1, lastResult];
    }

    var endMinutes = 1440;

    for (var i = 0; i < isf_data.length - 1; i++) {
        var currentISF = isf_data[i];
        var nextISF = isf_data[i+1];
        if (nowMinutes >= currentISF.offset && nowMinutes < nextISF.offset) {
            endMinutes = nextISF.offset;
            isfSchedule = isf_data[i];
            break;
        }
    }

    lastResult = isfSchedule;
    lastResult.endOffset = endMinutes;

    return [isfSchedule.sensitivity, lastResult];
}

isfLookup.isfLookup = isfLookup;
exports = module.exports = isfLookup;
