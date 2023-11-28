/**
 * This function, 'translate', processes an array of diabetes treatment data ('treatments') and converts it
 * into a more manageable format by filtering out specific types of entries and modifying others.
 * It operates by iterating through each entry in the 'treatments' array and processing it according to its type.
 * Entries with certain types are filtered out ('invalid') while others are modified ('current').
 * The modified or valid entries are collected into the 'results' array, which is then returned.
 *
 * @param {Object[]} treatments - An array containing diabetes treatment data objects to be processed.
 * @returns {Object[]} - An array containing filtered and modified diabetes treatment data objects.
 */

'use strict';

function translate (treatments) {

  var results = [ ];
  
  function step (current) {
    var invalid = false;
    switch (current._type) {
      case 'CalBGForPH':
        current.eventType = 'BG Check';
        current.glucose = current.amount;
        current.glucoseType = 'Finger';
        break;
      case 'BasalProfileStart':
      case 'ResultDailyTotal':
      case 'BGReceived':
      case 'Sara6E':
      case 'Model522ResultTotals':
      case 'Model722ResultTotals':
        invalid = true;
        break;
      default:
        break;
    }

    if (!invalid) {
      results.push(current);
    }

  }
  treatments.forEach(step);
  return results;
}

exports = module.exports = translate;
