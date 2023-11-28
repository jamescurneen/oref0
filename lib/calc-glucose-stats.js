
/*
This JavaScript module defines a function named `updateGlucoseStats` that performs calculations and updates glucose statistics based on the input options:

- It utilizes external modules such as `moment` for date/time operations, `_` from lodash library for array manipulation, and `stats` from `glucose-stats.js`.
- The function `updateGlucoseStats` takes an `options` object as input and updates the glucose statistics in the `options.glucose_hist` array.
- It first converts the `options.glucose_hist` array to a new array `hist`, sorted by the 'dateString' property and adds a 'readDateMills' property using `moment` library.
- Subsequently, it calculates the sensor noise and NS noise values using functions from the `stats` module (`calcSensorNoise` and `calcNSNoise`), based on the provided glucose history.
- If the `options.glucose_hist` array contains glucose history data and has a length greater than zero, the function updates the noise level in the first element of the glucose history array.
- It compares the calculated noise value (`ns_noise_val`) with the existing noise level reported in the glucose history (`options.glucose_hist[0].noise`). If the latter exists, it takes the maximum value between the calculated noise and reported noise.
- The function then logs the calculated and set noise levels to the console.
- Finally, it returns the modified `options.glucose_hist` array with updated noise levels.
- This code seems to be part of a system handling glucose data, computing sensor noise, and updating the noise levels in glucose history records for monitoring purposes.
*/



const moment = require('moment');
const _ = require('lodash');
const stats = require('./glucose-stats');

module.exports = {};
const calcStatsExports = module.exports;

calcStatsExports.updateGlucoseStats = (options) => {
  var hist = _.map(_.sortBy(options.glucose_hist, 'dateString'), function readDate(value) {
      value.readDateMills = moment(value.dateString).valueOf();
      return value;
    });

  if (hist && hist.length > 0) {
    var noise_val = stats.calcSensorNoise(null, hist, null, null);

    var ns_noise_val = stats.calcNSNoise(noise_val, hist);

    if ('noise' in options.glucose_hist[0]) {
      console.error("Glucose noise CGM reported level: ", options.glucose_hist[0].noise);
      ns_noise_val = Math.max(ns_noise_val, options.glucose_hist[0].noise);
    }

    console.error("Glucose noise calculated: ", noise_val, " setting noise level to ", ns_noise_val);

    options.glucose_hist[0].noise = ns_noise_val;
  }

  return options.glucose_hist;
};
