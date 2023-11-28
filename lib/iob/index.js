
/*
  This JavaScript module defines a function 'generate' responsible for generating Insulin on Board (IOB)
  calculations based on input treatments and profile data in an automated insulin delivery system. The code
  integrates various calculations and historical data to estimate the amount of active insulin in the body
  at different time intervals.

  Key Functions:
  - 'generate(inputs, currentIOBOnly, treatments)': Calculates IOB based on the provided inputs, considering
    the treatments received, the current IOB status, and historical data.
  
  The 'generate' function performs the following steps:
  1. Fetches insulin treatment history and calculates IOB based on the provided data.
  2. Determines the last bolus time and last temporary basal based on the treatment history.
  3. Predicts and calculates IOB values for future time intervals (up to 4 hours) using 'sum' function.
  4. Considers zero-temp insulin events to adjust and calculate IOB under continuous zero-temping conditions.
  5. Generates an array of IOB calculations for future time intervals.

  The code considers various treatment types, such as boluses and temporary basal rates, to compute IOB
  estimations at different time intervals, aiding in predicting insulin effects and guiding future insulin
  dosing decisions in an automated insulin delivery system.
*/

'use strict';

var tz = require('moment-timezone');
var find_insulin = require('./history');
var calculate = require('./calculate');
var sum = require('./total');

function generate (inputs, currentIOBOnly, treatments) {

    if (!treatments) {
        var treatments = find_insulin(inputs);
        // calculate IOB based on continuous future zero temping as well
        var treatmentsWithZeroTemp = find_insulin(inputs, 240);
    } else {
        var treatmentsWithZeroTemp = [];
    }
    //console.error(treatments.length, treatmentsWithZeroTemp.length);
    //console.error(treatments[treatments.length-1], treatmentsWithZeroTemp[treatmentsWithZeroTemp.length-1])

    var opts = {
        treatments: treatments
    , profile: inputs.profile
    , calculate: calculate
    };
    if ( inputs.autosens ) {
        opts.autosens = inputs.autosens;
    }
    var optsWithZeroTemp = {
        treatments: treatmentsWithZeroTemp
    , profile: inputs.profile
    , calculate: calculate
    };

    var iobArray = [];
    //console.error(inputs.clock);
    if (! /(Z|[+-][0-2][0-9]:?[034][05])+/.test(inputs.clock) ) {
        console.error("Warning: clock input " + inputs.clock + " is unzoned; please pass clock-zoned.json instead");
    }
    var clock = new Date(tz(inputs.clock));

    var lastBolusTime = new Date(0).getTime(); //clock.getTime());
    var lastTemp = {};
    lastTemp.date = new Date(0).getTime(); //clock.getTime());
    //console.error(treatments[treatments.length-1]);
    treatments.forEach(function(treatment) {
        if (treatment.insulin && treatment.started_at) {
            lastBolusTime = Math.max(lastBolusTime,treatment.started_at);
            //console.error(treatment.insulin,treatment.started_at,lastBolusTime);
        } else if (typeof(treatment.rate) === 'number' && treatment.duration ) {
            if ( treatment.date > lastTemp.date ) {
                lastTemp = treatment;
                lastTemp.duration = Math.round(lastTemp.duration*100)/100;
            }

            //console.error(treatment.rate, treatment.duration, treatment.started_at,lastTemp.started_at)
        }
        //console.error(treatment.rate, treatment.duration, treatment.started_at,lastTemp.started_at)
        //if (treatment.insulin && treatment.started_at) { console.error(treatment.insulin,treatment.started_at,lastBolusTime); }
    });
    var iStop;
    if (currentIOBOnly) {
        // for COB calculation, we only need the zeroth element of iobArray
        iStop=1
    } else {
        // predict IOB out to 4h, regardless of DIA
        iStop=4*60;
    }
    for (var i=0; i<iStop; i+=5){
        var t = new Date(clock.getTime() + i*60000);
        //console.error(t);
        var iob = sum(opts, t);
        var iobWithZeroTemp = sum(optsWithZeroTemp, t);
        //console.error(opts.treatments[opts.treatments.length-1], optsWithZeroTemp.treatments[optsWithZeroTemp.treatments.length-1])
        iobArray.push(iob);
        //console.error(iob.iob, iobWithZeroTemp.iob);
        //console.error(iobArray.length-1, iobArray[iobArray.length-1]);
        iobArray[iobArray.length-1].iobWithZeroTemp = iobWithZeroTemp;
    }
    //console.error(lastBolusTime);
    iobArray[0].lastBolusTime = lastBolusTime;
    iobArray[0].lastTemp = lastTemp;
    return iobArray;
}

exports = module.exports = generate;
