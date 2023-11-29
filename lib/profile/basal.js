/*
  This module contains functions related to the calculation and retrieval of basal rates used in diabetes management systems.
  The code includes the following functions:

  1. basalLookup: This function takes in schedules and a timestamp to determine the basal rate (units per hour - U/hr)
     at the provided time of day. It sorts the schedules, identifies the relevant basal rate based on the current time,
     and returns the calculated basal rate.

  2. maxDailyBasal: Calculates the maximum daily basal rate (U/hr) based on the maximum rate from the provided basal rates.

  3. maxBasalLookup: Retrieves the maximum basal rate (U/hr) from the input settings.

  The code leverages the lodash library for utility functions and primarily deals with the manipulation and retrieval
  of basal rates essential for managing diabetes. Functions like basalLookup help determine the current basal rate at a
  given time, while others focus on extracting the maximum basal rates.
*/

'use strict';

var _ = require('lodash');

/* Return basal rate(U / hr) at the provided timeOfDay */
function basalLookup (schedules, now) {

    var nowDate = now;

    if (typeof(now) === 'undefined') {
      nowDate = new Date();
    }

    var basalprofile_data = _.sortBy(schedules, function(o) { return o.i; });
    var basalRate = basalprofile_data[basalprofile_data.length-1].rate
    if (basalRate === 0) {
        // TODO - shared node - move this print to shared object.
        console.error("ERROR: bad basal schedule",schedules);
        return;
    }
    var nowMinutes = nowDate.getHours() * 60 + nowDate.getMinutes();

    for (var i = 0; i < basalprofile_data.length - 1; i++) {
        if ((nowMinutes >= basalprofile_data[i].minutes) && (nowMinutes < basalprofile_data[i + 1].minutes)) {
            basalRate = basalprofile_data[i].rate;
            break;
        }
    }
    return Math.round(basalRate*1000)/1000;
}


function maxDailyBasal (inputs) {
    var maxRate = _.maxBy(inputs.basals,function(o) { return Number(o.rate); });
    return (Number(maxRate.rate) *1000)/1000;
}

/*Return maximum daily basal rate(U / hr) from profile.basals */

function maxBasalLookup (inputs) {
    return inputs.settings.maxBasal;
}


exports.maxDailyBasal = maxDailyBasal;
exports.maxBasalLookup = maxBasalLookup;
exports.basalLookup = basalLookup;
