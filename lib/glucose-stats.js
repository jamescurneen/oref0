/*
The provided JavaScript module comprises functions for computing and analyzing glucose statistics and noise levels from historical glucose data:

- The module exports several functions:
  - `calcNoise`: Calculates noise based on glucose readings and timestamps. It calculates the sum of distances (sod) between glucose readings and overall distances, then derives noise using a specific formula. This function aims to assess the noise level in glucose data.
  - `calcSensorNoise`: Calculates sensor noise by filtering glucose data and calling `calcNoise` to determine noise levels based on the provided data and calibration values.
  - `calcTrend`: Computes the trend based on glucose history, assessing changes in glucose readings over a period and deriving trends from the changes.
  - `calcNSNoise`: Determines noise levels using glucose history and delta between glucose values, defining noise categories based on specific thresholds and conditions.
  - `NSNoiseString`: Converts noise levels to descriptive strings for categorization.

- The functions operate on arrays of glucose data objects, calculating statistics, trends, and noise levels based on glucose readings, timestamps, and calibration values.
- These functions are designed to aid in analyzing glucose data and deriving insights regarding trends, noise, and variations in glucose levels over time.
- The calculations include considerations for sensor noise, trend analysis, and categorization of noise levels, offering valuable information for diabetic care or related healthcare purposes.
*/
/**
 * Calculates the noise level based on glucose data points and time intervals.
 * This function computes the noise level using the provided glucose data array.
 * It considers the movement of glucose values over time and determines the noise level
 * based on the sum of distances and overall distance between the first and last points.
 * The noise calculation is done using the formula: 1 - sod / overallDistance.
 * Noise value gets closer to zero when the sum of individual lines is mostly in a straight
 * or straight-moving curve pattern. Conversely, noise value approaches one when the sum of
 * distances between glucose data points becomes large, indicating more erratic glucose trends.
 *
 * Example:
 * Given the following glucose data array:
 * [
 *   { glucose: 100, readDate: 1637793600000 }, // Glucose: 100 mg/dL at Unix timestamp: 1637793600000
 *   { glucose: 110, readDate: 1637793700000 }, // Glucose: 110 mg/dL at Unix timestamp: 1637793700000
 *   { glucose: 105, readDate: 1637793800000 }  // Glucose: 105 mg/dL at Unix timestamp: 1637793800000
 * ]
 * We can compute the noise level using this function by providing an array similar to the above
 * containing glucose values and their corresponding read dates.
 * The resulting noise value will indicate the level of irregularity or stability in the glucose trends.
 *
 * @param {Array} sgvArr - An array of glucose data objects containing 'glucose' and 'readDate' properties.
 * @returns {number} - A value indicating the noise level, closer to zero for stable trends and closer to one for erratic trends.
 */


const moment = require('moment');

const log = console.error;

/* eslint-disable-next-line no-unused-vars */
const error = console.error;
const debug = console.error;

module.exports = {};
const calcStatsExports = module.exports;

// Calculate the sum of the distance of all points (sod)
// Calculate the overall distance between the first and the last point (overallDistance)
// Calculate the noise as the following formula: 1 - sod / overallDistance
// Noise will get closer to zero as the sum of the individual lines are mostly
// in a straight or straight moving curve
// Noise will get closer to one as the sum of the distance of the individual lines get large
// Also add multiplier to get more weight to the latest BG values
// Also added weight for points where the delta shifts from pos to neg or neg to pos (peaks/valleys)
// the more peaks and valleys, the more noise is amplified
// Input:
// [
//   {
//     real glucose   -- glucose value in mg/dL
//     real readDate  -- milliseconds since Epoch
//   },...
// ]
const calcNoise = (sgvArr) => {
  let noise = 0;

  const n = sgvArr.length;

  const firstSGV = sgvArr[0].glucose * 1000.0;
  const firstTime = sgvArr[0].readDate / 1000.0 * 30.0;

  const lastSGV = sgvArr[n - 1].glucose * 1000.0;
  const lastTime = sgvArr[n - 1].readDate / 1000.0 * 30.0;

  const xarr = [];

  for (let i = 0; i < n; i += 1) {
    xarr.push(sgvArr[i].readDate / 1000.0 * 30.0 - firstTime);
  }

  // sod = sum of distances
  let sod = 0;
  let lastDelta = 0;

  for (let i = 1; i < n; i += 1) {
    // y2y1Delta adds a multiplier that gives
    // higher priority to the latest BG's
    let y2y1Delta = (sgvArr[i].glucose - sgvArr[i - 1].glucose) * 1000.0 * (1 + i / (n * 3));

    const x2x1Delta = xarr[i] - xarr[i - 1];

    if ((lastDelta > 0) && (y2y1Delta < 0)) {
      // switched from positive delta to negative, increase noise impact
      y2y1Delta *= 1.1;
    } else if ((lastDelta < 0) && (y2y1Delta > 0)) {
      // switched from negative delta to positive, increase noise impact
      y2y1Delta *= 1.2;
    }

    lastDelta = y2y1Delta;

    sod += Math.sqrt(Math.pow(x2x1Delta, 2) + Math.pow(y2y1Delta, 2));
  }

  const overallsod = Math.sqrt(Math.pow(lastSGV - firstSGV, 2) + Math.pow(lastTime - firstTime, 2));

  if (sod === 0) {
    // protect from divide by 0
    noise = 0;
  } else {
    noise = 1 - (overallsod / sod);
  }

  return noise;
};

calcStatsExports.calcSensorNoise = (calcGlucose, glucoseHist, lastCal, sgv) => {
  const MAXRECORDS = 8;
  const MINRECORDS = 4;
  const sgvArr = [];

  const numRecords = Math.max(glucoseHist.length - MAXRECORDS, 0);

  for (let i = numRecords; i < glucoseHist.length; i += 1) {
    // Only use values that are > 30 to filter out invalid values.
    if (lastCal && (glucoseHist[i].glucose > 30) && ('unfiltered' in glucoseHist[i]) && (glucoseHist[i].unfiltered > 100)) {
      // use the unfiltered data with the most recent calculated calibration value
      // this will provide a noise calculation that is independent of calibration jumps
      sgvArr.push({
        glucose: calcGlucose(glucoseHist[i], lastCal),
        readDate: glucoseHist[i].readDateMills,
      });
    } else if (glucoseHist[i].glucose > 30) {
      // if raw data isn't available, use the transmitter calibrated glucose
      sgvArr.push({
        glucose: glucoseHist[i].glucose,
        readDate: glucoseHist[i].readDateMills,
      });
    }
  }

  if (sgv) {
    if (lastCal && 'unfiltered' in sgv && sgv.unfiltered > 100) {
      sgvArr.push({
        glucose: calcGlucose(sgv, lastCal),
        readDate: sgv.readDateMills,
      });
    } else {
      sgvArr.push({
        glucose: sgv.glucose,
        readDate: sgv.readDateMills,
      });
    }
  }
  if (sgvArr.length < MINRECORDS) {
    return 0;
  }
  return calcNoise(sgvArr);
};

// Return 10 minute trend total
calcStatsExports.calcTrend = (calcGlucose, glucoseHist, lastCal, sgv) => {
  let sgvHist = null;

  let trend = 0;

  if (glucoseHist.length > 0) {
    let maxDate = null;
    let timeSpan = 0;
    let totalDelta = 0;
    const currentTime = sgv ? moment(sgv.readDateMills)
      : moment(glucoseHist[glucoseHist.length - 1].readDateMills);

    sgvHist = [];

    // delete any deltas > 16 minutes and any that don't have an unfiltered value (backfill records)
    let minDate = currentTime.valueOf() - 16 * 60 * 1000;
    for (let i = 0; i < glucoseHist.length; i += 1) {
      if (lastCal && (glucoseHist[i].readDateMills >= minDate) && ('unfiltered' in glucoseHist[i]) && (glucoseHist[i].unfiltered > 100)) {
        sgvHist.push({
          glucose: calcGlucose(glucoseHist[i], lastCal),
          readDate: glucoseHist[i].readDateMills,
        });
      } else if (glucoseHist[i].readDateMills >= minDate) {
        sgvHist.push({
          glucose: glucoseHist[i].glucose,
          readDate: glucoseHist[i].readDateMills,
        });
      }
    }

    if (sgv) {
      if (lastCal && ('unfiltered' in sgv) && (sgv.unfiltered > 100)) {
        sgvHist.push({
          glucose: calcGlucose(sgv, lastCal),
          readDate: sgv.readDateMills,
        });
      } else {
        sgvHist.push({
          glucose: sgv.glucose,
          readDate: sgv.readDateMills,
        });
      }
    }

    if (sgvHist.length > 1) {
      minDate = sgvHist[0].readDate;
      maxDate = sgvHist[sgvHist.length - 1].readDate;

      // Use the current calibration value to calculate the glucose from the
      // unfiltered data. This allows the trend calculation to be independent
      // of the calibration jumps
      totalDelta = sgvHist[sgvHist.length - 1].glucose - sgvHist[0].glucose;

      timeSpan = (maxDate - minDate) / 1000.0 / 60.0;

      trend = 10 * totalDelta / timeSpan;
    }
  } else {
    debug(`Not enough history for trend calculation: ${glucoseHist.length}`);
  }

  return trend;
};

// Return sensor noise
calcStatsExports.calcNSNoise = (noise, glucoseHist) => {
  let nsNoise = 0; // Unknown
  const currSGV = glucoseHist[glucoseHist.length - 1];
  let deltaSGV = 0;

  if (glucoseHist.length > 1) {
    const priorSGV = glucoseHist[glucoseHist.length - 2];

    if ((currSGV.glucose > 30) && (priorSGV.glucose > 30)) {
      deltaSGV = currSGV.glucose - priorSGV.glucose;
    }
  }

  if (!currSGV) {
    nsNoise = 1;
  } else if (currSGV.glucose > 400) {
    log(`Glucose ${currSGV.glucose} > 400 - setting noise level Heavy`);
    nsNoise = 4;
  } else if (currSGV.glucose < 40) {
    log(`Glucose ${currSGV.glucose} < 40 - setting noise level Light`);
    nsNoise = 2;
  } else if (Math.abs(deltaSGV) > 30) {
    // This is OK even during a calibration jump because we don't want OpenAPS to be too
    // agressive with the "false" trend implied by a large positive jump
    log(`Glucose change ${deltaSGV} out of range [-30, 30] - setting noise level Heavy`);
    nsNoise = 4;
  } else if (noise < 0.35) {
    nsNoise = 1; // Clean
  } else if (noise < 0.5) {
    nsNoise = 2; // Light
  } else if (noise < 0.7) {
    nsNoise = 3; // Medium
  } else if (noise >= 0.7) {
    nsNoise = 4; // Heavy
  }

  return nsNoise;
};

calcStatsExports.NSNoiseString = (nsNoise) => {
  switch (nsNoise) {
    case 1:
      return 'Clean';
    case 2:
      return 'Light';
    case 3:
      return 'Medium';
    case 4:
      return 'Heavy';
    case 0:
    default:
      return 'Unknown';
  }
};
