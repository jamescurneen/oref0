/*
  This script comprises a function, `carbRatioLookup`, used to retrieve the carbohydrate ratio (carb ratio) from the provided inputs and profile data.
  The code operates as follows:

  - Import necessary dependencies, including a function to obtain the current time and a shared utility function for error logging.
  - `carbRatioLookup` takes three parameters: `final_result`, `inputs`, and `profile`. It fetches the carbohydrate ratio data
    from the `inputs`, evaluates the current time, and determines the appropriate carb ratio based on the schedule provided.
  - The function checks the units of the carb ratio data and calculates the ratio accordingly. If the units are in "exchanges",
    it converts the ratio to grams for ease of use in diabetes management calculations.
  - It returns the calculated carb ratio or logs an error if there's an issue with the input data or decoding.

  Additionally:
  - `carbRatioLookup` is set as a property of the exported module for potential access outside this module.
*/


'use strict';

var getTime = require('../medtronic-clock');
var shared_node_utils = require('../../bin/oref0-shared-node-utils');
var console_error = shared_node_utils.console_error;

function carbRatioLookup (final_result, inputs, profile) {
    var now = new Date();
    var carbratio_data = inputs.carbratio;
    if (typeof(carbratio_data) !== "undefined" && typeof(carbratio_data.schedule) !== "undefined") {
        var carbRatio;
        if ((carbratio_data.units === "grams") || (carbratio_data.units === "exchanges")) {
            //carbratio_data.schedule.sort(function (a, b) { return a.offset > b.offset });
            carbRatio = carbratio_data.schedule[carbratio_data.schedule.length - 1];

            for (var i = 0; i < carbratio_data.schedule.length - 1; i++) {
                if ((now >= getTime(carbratio_data.schedule[i].offset)) && (now < getTime(carbratio_data.schedule[i + 1].offset))) {
                    carbRatio = carbratio_data.schedule[i];
                    // disallow impossibly high/low carbRatios due to bad decoding
                    if (carbRatio < 3 || carbRatio > 150) {
                        console_error(final_result, "Error: carbRatio of " + carbRatio + " out of bounds.");
                        return;
                    }
                    break;
                }
            }
            if (carbratio_data.units === "exchanges") {
                carbRatio.ratio = 12 / carbRatio.ratio
            }
            return carbRatio.ratio;
        } else {
            console_error(final_result, "Error: Unsupported carb_ratio units " + carbratio_data.units);
            return;
        }
    //return carbRatio.ratio;
    //profile.carbratio = carbRatio.ratio;
    } else { return; }
}

carbRatioLookup.carbRatioLookup = carbRatioLookup;
exports = module.exports = carbRatioLookup;
