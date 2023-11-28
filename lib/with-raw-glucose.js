/**
 * This module exports a function 'withRawGlucose' that processes an entry to include raw glucose data based on calibration values and specific conditions.
 * 
 * Functions:
 * 
 * - cleanCal(cal): A function that cleans and validates the calibration parameters.
 * 
 * - withRawGlucose(entry, cals, maxRaw): The main function that processes an entry to include raw glucose data based on provided calibration values and conditions.
 *                                        It checks the type of entry, reads glucose values, calculates raw glucose based on calibration parameters, and updates noise levels.
 * 
 * Process Description:
 * 
 * - 'withRawGlucose' function processes an entry object and augments it with raw glucose data based on calibration values (if available).
 * - It checks the entry type and reads glucose values ('egv') from the entry object.
 * - 'cleanCal' function cleans and validates calibration parameters for use in raw glucose calculations.
 * - Raw glucose is calculated and added to the entry based on certain conditions such as filtered and unfiltered values and calibration parameters.
 * - 'entry.noise' attribute is updated based on specific glucose and raw glucose thresholds.
 * 
 * @param {Object} entry - An object representing glucose entry data.
 * @param {Array} cals - An array containing calibration values.
 * @param {number} maxRaw - Maximum threshold for raw glucose values. Defaults to 200 if not provided.
 * @returns {Object} - An augmented entry object with raw glucose data and updated noise levels.
 * @module withRawGlucose
 */



'use strict';

function cleanCal (cal) {
  var clean = {
    scale: parseFloat(cal.scale) || 0
    , intercept: parseFloat(cal.intercept) || 0
    , slope: parseFloat(cal.slope) || 0
  };

  clean.valid = ! (clean.slope === 0 || clean.unfiltered === 0 || clean.scale === 0);

  return clean;
}

module.exports = function withRawGlucose (entry, cals, maxRaw) {
  maxRaw = maxRaw || 200;

  if ( entry.type === "mbg" || entry.type === "cal" ) {
    return entry;
  }
  var egv = entry.glucose || entry.sgv || 0;

  entry.unfiltered = parseInt(entry.unfiltered) || 0;
  entry.filtered = parseInt(entry.filtered) || 0;

  //TODO: add time check, but how recent should it be?
  //TODO: currently assuming the first is the best (and that there is probably just 1 cal)
  var cal = cals && cals.length > 0 && cleanCal(cals[0]);

  if (cal && cal.valid) {
    if (cal.filtered === 0 || egv < 40) {
      entry.raw = Math.round(cal.scale * (entry.unfiltered - cal.intercept) / cal.slope);
    } else {
      var ratio = cal.scale * (entry.filtered - cal.intercept) / cal.slope / egv;
      entry.raw = Math.round(cal.scale * (entry.unfiltered - cal.intercept) / cal.slope / ratio);
    }

    if ( egv < 40 ) {
        if (entry.raw) {
            entry.glucose = entry.raw;
            entry.fromRaw = true;
            if (entry.raw <= maxRaw) {
                entry.noise = 2;
            } else {
                entry.noise = 3;
            }
        } else {
            entry.noise = 3;
        }
    } else if (! entry.noise) {
        entry.noise = 0;
    }

  }
  return entry;
};
