/*
  This JavaScript module exports a function named 'recentCarbs' responsible for calculating recent carb-related data.
  It utilizes inputs such as treatments, profile data, glucose information, and basal profiles to compute various
  carb-related metrics and parameters essential for diabetes management.

  Key Functions:
  - 'recentCarbs(opts, time)': Computes recent carb-related information based on provided options and a specified time.

  The 'recentCarbs' function performs the following steps:
  1. Retrieves necessary input data from 'opts', including treatments, profile data, glucose information, etc.
  2. Sorts the treatments chronologically and processes carb-related data within a specified time window (up to 6 hours).
  3. Calculates meal-related information, such as total carbs, carbs from different sources, and their absorption rates.
  4. Computes metrics related to carb absorption, deviations, and slopes based on glucose information.
  5. Sets upper limits for meal-related metrics to mitigate erroneous or potentially malicious carb entries.
  6. Returns computed recent carb-related data, including total carbs, meal COB (Carbs On Board), deviations, slopes, etc.

  This code module plays a crucial role in determining recent carb-related information, which aids in understanding
  the impact of carbs on blood glucose levels. It is a part of a diabetes management system to derive essential
  insights for making informed decisions related to insulin dosages and treatment adjustments.
*/



'use strict';

var tz = require('moment-timezone');
var detectCarbAbsorption = require('../determine-basal/cob');

function recentCarbs(opts, time) {
    var treatments = opts.treatments;
    var profile_data = opts.profile;
    if (typeof(opts.glucose) !== 'undefined') {
        var glucose_data = opts.glucose;
    }
    var carbs = 0;
    var nsCarbs = 0;
    var bwCarbs = 0;
    var journalCarbs = 0;
    var bwFound = false;
    var mealCarbTime = time.getTime();
    var lastCarbTime = 0;
    if (!treatments) return {};

    //console.error(glucose_data);
    var iob_inputs = {
        profile: profile_data
    ,   history: opts.pumphistory
    };
    var COB_inputs = {
        glucose_data: glucose_data
    ,   iob_inputs: iob_inputs
    ,   basalprofile: opts.basalprofile
    ,   mealTime: mealCarbTime
    };
    var mealCOB = 0;

    // this sorts the treatments collection in order.
    treatments.sort(function (a, b) {
        var aDate = new Date(tz(a.timestamp));
        var bDate = new Date(tz(b.timestamp));
        //console.error(aDate);
        return bDate.getTime() - aDate.getTime();
    });

    var carbsToRemove = 0;
    var nsCarbsToRemove = 0;
    var bwCarbsToRemove = 0;
    var journalCarbsToRemove = 0;
    treatments.forEach(function(treatment) {
        var now = time.getTime();
        // consider carbs from up to 6 hours ago in calculating COB
        var carbWindow = now - 6 * 60*60*1000;
        var treatmentDate = new Date(tz(treatment.timestamp));
        var treatmentTime = treatmentDate.getTime();
        if (treatmentTime > carbWindow && treatmentTime <= now) {
            if (treatment.carbs >= 1) {
                if (treatment.nsCarbs >= 1) {
                    nsCarbs += parseFloat(treatment.nsCarbs);
                } else if (treatment.bwCarbs >= 1) {
                    bwCarbs += parseFloat(treatment.bwCarbs);
                    bwFound = true;
                } else if (treatment.journalCarbs >= 1) {
                    journalCarbs += parseFloat(treatment.journalCarbs);
                } else {
                    console.error("Treatment carbs unclassified:",treatment);
                }
                //console.error(treatment.carbs, maxCarbs, treatmentDate);
                carbs += parseFloat(treatment.carbs);
                COB_inputs.mealTime = treatmentTime;
                lastCarbTime = Math.max(lastCarbTime,treatmentTime);
                var myCarbsAbsorbed = detectCarbAbsorption(COB_inputs).carbsAbsorbed; //?????????????????????????????? here prfile was defined
                var myMealCOB = Math.max(0, carbs - myCarbsAbsorbed);
                if (typeof(myMealCOB) === 'number' && ! isNaN(myMealCOB)) {
                    mealCOB = Math.max(mealCOB, myMealCOB);
                } else {
                    console.error("Bad myMealCOB:",myMealCOB, "mealCOB:",mealCOB, "carbs:",carbs,"myCarbsAbsorbed:",myCarbsAbsorbed);
                }
                if (myMealCOB < mealCOB) {
                    carbsToRemove += parseFloat(treatment.carbs);
                    if (treatment.nsCarbs >= 1) {
                        nsCarbsToRemove += parseFloat(treatment.nsCarbs);
                    } else if (treatment.bwCarbs >= 1) {
                        bwCarbsToRemove += parseFloat(treatment.bwCarbs);
                    } else if (treatment.journalCarbs >= 1) {
                        journalCarbsToRemove += parseFloat(treatment.journalCarbs);
                    }
                } else {
                    carbsToRemove = 0;
                    nsCarbsToRemove = 0;
                    bwCarbsToRemove = 0;
                }
                //console.error(carbs, carbsToRemove);
                //console.error("COB:",mealCOB);
            }
        }
    });
    // only include carbs actually used in calculating COB
    carbs -= carbsToRemove;
    nsCarbs -= nsCarbsToRemove;
    bwCarbs -= bwCarbsToRemove;
    journalCarbs -= journalCarbsToRemove;

    // calculate the current deviation and steepest deviation downslope over the last hour
    COB_inputs.ciTime = time.getTime();
    // set mealTime to 6h ago for Deviation calculations
    COB_inputs.mealTime = time.getTime() - 6 * 60 * 60 * 1000;
    var c = detectCarbAbsorption(COB_inputs);
    //console.error(c.currentDeviation, c.slopeFromMaxDeviation);

    // set a hard upper limit on COB to mitigate impact of erroneous or malicious carb entry
    if (typeof(profile_data.maxCOB) === 'number' && ! isNaN(profile_data.maxCOB)) {
        mealCOB = Math.min( profile_data.maxCOB, mealCOB );
    } else {
        console.error("Bad profile.maxCOB:",profile_data.maxCOB);
    }

    // if currentDeviation is null or maxDeviation is 0, set mealCOB to 0 for zombie-carb safety
    if (typeof(c.currentDeviation) === 'undefined' || c.currentDeviation === null) {
        console.error("");
        console.error("Warning: setting mealCOB to 0 because currentDeviation is null/undefined");
        mealCOB = 0;
    }
    if (typeof(c.maxDeviation) === 'undefined' || c.maxDeviation === null) {
        console.error("");
        console.error("Warning: setting mealCOB to 0 because maxDeviation is 0 or undefined");
        mealCOB = 0;
    }

    return {
        carbs: Math.round( carbs * 1000 ) / 1000
    ,   nsCarbs: Math.round( nsCarbs * 1000 ) / 1000
    ,   bwCarbs: Math.round( bwCarbs * 1000 ) / 1000
    ,   journalCarbs: Math.round( journalCarbs * 1000 ) / 1000
    ,   mealCOB: Math.round( mealCOB )
    ,   currentDeviation: Math.round( c.currentDeviation * 100 ) / 100
    ,   maxDeviation: Math.round( c.maxDeviation * 100 ) / 100
    ,   minDeviation: Math.round( c.minDeviation * 100 ) / 100
    ,   slopeFromMaxDeviation: Math.round( c.slopeFromMaxDeviation * 1000 ) / 1000
    ,   slopeFromMinDeviation: Math.round( c.slopeFromMinDeviation * 1000 ) / 1000
    ,   allDeviations: c.allDeviations
    ,   lastCarbTime: lastCarbTime
    ,   bwFound: bwFound
    };
}

exports = module.exports = recentCarbs;

