
/**
 * This module provides a 'filter' function to process a list of treatments and transform them by identifying and organizing temporary basal events.
 * It extracts temporary basal events from the input 'treatments' list, filters and organizes the data based on specific attributes, and outputs the refined results.
 * 
 * Functions:
 * 
 * - filter(treatments): A function that filters temporary basal events from the 'treatments' array and organizes them for output.
 *                       It identifies and extracts TempBasalDuration and TempBasal events, then organizes the data based on specific attributes.
 * 
 * Process Description:
 * 
 * - 'filter' function initializes 'results' array to store processed data and 'state' object to maintain temporary state information.
 * - 'temp' function processes each event and identifies key attributes like duration, rate, and timestamp.
 * - 'step' function iterates through each treatment, categorizes based on '_type', and processes 'TempBasalDuration' and 'TempBasal' events using the 'temp' function.
 * - Extracted and organized temporary basal events are added to 'results'.
 * 
 * @param {Array} treatments - An array of treatment objects containing various treatment types and attributes.
 * @returns {Array} - A filtered and organized array of treatments, particularly identifying Temp Basal events.
 * @module tempBasalFilter
 */



'use strict';

function filter (treatments) {

  var results = [ ];

  var state = { };
  
  function temp (ev) {
    if ('duration (min)' in ev) {
      state.duration = ev['duration (min)'].toString( );
      state.raw_duration = ev;
    }

    if ('rate' in ev) {
      state[ev.temp] = ev.rate.toString( );
      state.rate = ev['rate'];
      state.raw_rate = ev;
    }

    if ('timestamp' in state && ev.timestamp !== state.timestamp) {
      state.invalid = true;
    } else {
      state.timestamp = ev.timestamp;
    }

    if ('duration' in state && ('percent' in state || 'absolute' in state)) {
      state.eventType = 'Temp Basal';
      results.push(state);
      state = { };
    }
  }

  function step (current) {
    switch (current._type) {
      case 'TempBasalDuration':
      case 'TempBasal':
        temp(current);
        break;
      default:
        results.push(current);
        break;
    }
  }
  treatments.forEach(step);
  return results;
}

exports = module.exports = filter;
