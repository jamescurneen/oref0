/**
 * @module categorizeBGDatums
 * 
 * This module exports a function 'categorizeBGDatums' that categorizes glucose data points into different categories
 * based on various conditions, including carb absorption, deviations, insulin activity, and more.
 * 
 * Functions and Process Description:
 * 
 * - The function processes glucose data and categorizes it into CSF (Carb-Sensitive Factor), ISF (Insulin Sensitivity Factor),
 *   UAM (Unannounced Meal), and basal categories based on deviations, meal absorptions, and insulin activity.
 * 
 * - It uses historical glucose data, treatments, and profile data to make categorizations and calculate various metrics
 *   such as carb impact, deviations, IOB (Insulin on Board), and BGI (Blood Glucose Impact).
 * 
 * - The function identifies meal-related data points, tracks carb absorptions, and distinguishes between announced and unannounced meals.
 * 
 * - It uses various flags ('mealAbsorption', 'uamAbsorption') to mark the start and end of carb absorption or unannounced meal absorptions.
 * 
 * - Additionally, it performs computations to determine deviations, insulin impacts, and categorizes data points accordingly.
 * 
 * Usage:
 * 
 * - Include this module in your code to categorize glucose data and analyze different glucose-related parameters.
 * 
 * @param {Object} opts - An object containing glucose, treatments, profile, pump history, and other necessary data.
 * @returns {Object} - An object containing categorized glucose data points in CSF, ISF, UAM, and basal categories,
 *                     along with additional data related to Carb Ratios (CRData).
 */



'use strict';

var tz = require('moment-timezone');
var basal = require('../profile/basal');
var getIOB = require('../iob');
var ISF = require('../profile/isf');
var find_insulin = require('../iob/history');
var dosed = require('./dosed');

// main function categorizeBGDatums. ;) categorize to ISF, CSF, or basals.

function categorizeBGDatums(opts) {
    var treatments = opts.treatments;
    // this sorts the treatments collection in order.
    treatments.sort(function (a, b) {
        var aDate = new Date(tz(a.timestamp));
        var bDate = new Date(tz(b.timestamp));
        //console.error(aDate);
        return bDate.getTime() - aDate.getTime();
    });
    var profileData = opts.profile;

    var glucoseData = [ ];
    if (typeof(opts.glucose) !== 'undefined') {
        //var glucoseData = opts.glucose;
        glucoseData = opts.glucose.map(function prepGlucose (obj) {
            //Support the NS sgv field to avoid having to convert in a custom way
            obj.glucose = obj.glucose || obj.sgv;

            if (obj.date) {
                //obj.BGTime = new Date(obj.date);
            } else if (obj.displayTime) {
                // Attempt to get date from displayTime
                obj.date = new Date(obj.displayTime.replace('T', ' ')).getTime();
            } else if (obj.dateString) {
                // Attempt to get date from dateString
                obj.date = new Date(obj.dateString).getTime();
            }// else { console.error("Could not determine BG time"); }

            if (!obj.dateString)
            {
                obj.dateString = new Date(tz(obj.date)).toISOString();
            }
            return obj;
        }).filter(function filterRecords(obj) {
            // Only take records with a valid date record
            // and a glucose value, which is also above 39
            return (obj.date && obj.glucose && obj.glucose >=39);
        }).sort(function (a, b) {
            // sort the collection in order
            return b.date - a.date;
        });
    }
    // if (typeof(opts.preppedGlucose) !== 'undefined') {
        // var preppedGlucoseData = opts.preppedGlucose;
    // }
    //starting variable at 0
    var boluses = 0;
    var maxCarbs = 0;
    //console.error(treatments);
    if (!treatments) return {};

    //console.error(glucoseData);
    var IOBInputs = {
        profile: profileData
    ,   history: opts.pumpHistory
    };
    var CSFGlucoseData = [];
    var ISFGlucoseData = [];
    var basalGlucoseData = [];
    var UAMGlucoseData = [];
    var CRData = [];

    var bucketedData = [];
    bucketedData[0] = JSON.parse(JSON.stringify(glucoseData[0]));
    var j=0;
    var k=0; // index of first value used by bucket
    //for loop to validate and bucket the data
    for (var i=1; i < glucoseData.length; ++i) {
        var BGTime = glucoseData[i].date;
        var lastBGTime = glucoseData[k].date;
        var elapsedMinutes = (BGTime - lastBGTime)/(60*1000);

        if(Math.abs(elapsedMinutes) >= 2) {
            j++; // move to next bucket
            k=i; // store index of first value used by bucket
            bucketedData[j]=JSON.parse(JSON.stringify(glucoseData[i]));
        } else {
            // average all readings within time deadband
            var glucoseTotal = glucoseData.slice(k, i+1).reduce(function(total, entry) {
                return total + entry.glucose;
            }, 0);
            bucketedData[j].glucose = glucoseTotal / (i-k+1);
        }
    }
    //console.error(bucketedData);
    //console.error(bucketedData[bucketedData.length-1]);
    // go through the treatments and remove any that are older than the oldest glucose value
    //console.error(treatments);
    for (i=treatments.length-1; i>0; --i) {
        var treatment = treatments[i];
        //console.error(treatment);
        if (treatment) {
            var treatmentDate = new Date(tz(treatment.timestamp));
            var treatmentTime = treatmentDate.getTime();
            var glucoseDatum = bucketedData[bucketedData.length-1];
            //console.error(glucoseDatum);
            if (glucoseDatum) {
                var BGDate = new Date(glucoseDatum.date);
                BGTime = BGDate.getTime();
                if ( treatmentTime < BGTime ) {
                    treatments.splice(i,1);
                }
            }
        }
    }
    //console.error(treatments);
    var calculatingCR = false;
    var absorbing = 0;
    var uam = 0; // unannounced meal
    var mealCOB = 0;
    var mealCarbs = 0;
    var CRCarbs = 0;
    var type="";
    // main for loop
    var fullHistory = IOBInputs.history;
    var lastIsfResult = null;
    for (i=bucketedData.length-5; i > 0; --i) {
        glucoseDatum = bucketedData[i];
        //console.error(glucoseDatum);
        BGDate = new Date(glucoseDatum.date);
        BGTime = BGDate.getTime();
        // As we're processing each data point, go through the treatment.carbs and see if any of them are older than
        // the current BG data point.  If so, add those carbs to COB.
        treatment = treatments[treatments.length-1];
        var myCarbs = 0;
        if (treatment) {
            treatmentDate = new Date(tz(treatment.timestamp));
            treatmentTime = treatmentDate.getTime();
            //console.error(treatmentDate);
            if ( treatmentTime < BGTime ) {
                if (treatment.carbs >= 1) {
                    mealCOB += parseFloat(treatment.carbs);
                    mealCarbs += parseFloat(treatment.carbs);
                    myCarbs = treatment.carbs;
                }
                treatments.pop();
            }
        }

        var BG;
        var delta;
        var avgDelta;
        // TODO: re-implement interpolation to avoid issues here with gaps
        // calculate avgDelta as last 4 datapoints to better catch more rises after COB hits zero
        if (typeof(bucketedData[i].glucose) !== 'undefined' && typeof(bucketedData[i+4].glucose) !== 'undefined') {
            //console.error(bucketedData[i]);
            BG = bucketedData[i].glucose;
            if ( BG < 40 || bucketedData[i+4].glucose < 40) {
                //process.stderr.write("!");
                continue;
            }
            delta = (BG - bucketedData[i+1].glucose);
            avgDelta = (BG - bucketedData[i+4].glucose)/4;
        } else { console.error("Could not find glucose data"); }

        avgDelta = avgDelta.toFixed(2);
        glucoseDatum.avgDelta = avgDelta;

        //sens = ISF
        var sens;
        [sens, lastIsfResult] = ISF.isfLookup(IOBInputs.profile.isfProfile, BGDate, lastIsfResult);
        IOBInputs.clock=BGDate.toISOString();
        // trim down IOBInputs.history to just the data for 6h prior to BGDate
        //console.error(IOBInputs.history[0].created_at);
        var newHistory = [];
        for (var h=0; h<fullHistory.length; h++) {
            var hDate = new Date(fullHistory[h].created_at)
            //console.error(fullHistory[i].created_at, hDate, BGDate, BGDate-hDate);
            //if (h == 0 || h == fullHistory.length - 1) {
                //console.error(hDate, BGDate, hDate-BGDate)
            //}
            if (BGDate-hDate < 6*60*60*1000 && BGDate-hDate > 0) {
                //process.stderr.write("i");
                //console.error(hDate);
                newHistory.push(fullHistory[h]);
            }
        }
        IOBInputs.history = newHistory;
        // process.stderr.write("" + newHistory.length + " ");
        //console.error(newHistory[0].created_at,newHistory[newHistory.length-1].created_at,newHistory.length);


        // for IOB calculations, use the average of the last 4 hours' basals to help convergence;
        // this helps since the basal this hour could be different from previous, especially if with autotune they start to diverge.
        // use the pumpbasalprofile to properly calculate IOB during periods where no temp basal is set
        var currentPumpBasal = basal.basalLookup(opts.pumpbasalprofile, BGDate);
        var BGDate1hAgo = new Date(BGTime-1*60*60*1000);
        var BGDate2hAgo = new Date(BGTime-2*60*60*1000);
        var BGDate3hAgo = new Date(BGTime-3*60*60*1000);
        var basal1hAgo = basal.basalLookup(opts.pumpbasalprofile, BGDate1hAgo);
        var basal2hAgo = basal.basalLookup(opts.pumpbasalprofile, BGDate2hAgo);
        var basal3hAgo = basal.basalLookup(opts.pumpbasalprofile, BGDate3hAgo);
        var sum = [currentPumpBasal,basal1hAgo,basal2hAgo,basal3hAgo].reduce(function(a, b) { return a + b; });
        IOBInputs.profile.currentBasal = Math.round((sum/4)*1000)/1000;

        // this is the current autotuned basal, used for everything else besides IOB calculations
        var currentBasal = basal.basalLookup(opts.basalprofile, BGDate);

        //console.error(currentBasal,basal1hAgo,basal2hAgo,basal3hAgo,IOBInputs.profile.currentBasal);
        // basalBGI is BGI of basal insulin activity.
        var basalBGI = Math.round(( currentBasal * sens / 60 * 5 )*100)/100; // U/hr * mg/dL/U * 1 hr / 60 minutes * 5 = mg/dL/5m
        //console.log(JSON.stringify(IOBInputs.profile));
        // call iob since calculated elsewhere
        var iob = getIOB(IOBInputs)[0];
        //console.error(JSON.stringify(iob));

        // activity times ISF times 5 minutes is BGI
        var BGI = Math.round(( -iob.activity * sens * 5 )*100)/100;
        // datum = one glucose data point (being prepped to store in output)
        glucoseDatum.BGI = BGI;
        // calculating deviation
        var deviation = avgDelta-BGI;
        var dev5m = delta-BGI;
        //console.error(deviation,avgDelta,BG,bucketedData[i].glucose);

        // set positive deviations to zero if BG is below 80
        if ( BG < 80 && deviation > 0 ) {
            deviation = 0;
        }

        // rounding and storing deviation
        deviation = deviation.toFixed(2);
        dev5m = dev5m.toFixed(2);
        glucoseDatum.deviation = deviation;


        // Then, calculate carb absorption for that 5m interval using the deviation.
        if ( mealCOB > 0 ) {
            var profile = profileData;
            var ci = Math.max(deviation, profile.min_5m_carbimpact);
            var absorbed = ci * profile.carb_ratio / sens;
            // Store the COB, and use it as the starting point for the next data point.
            mealCOB = Math.max(0, mealCOB-absorbed);
        }


        // Calculate carb ratio (CR) independently of CSF and ISF
        // Use the time period from meal bolus/carbs until COB is zero and IOB is < currentBasal/2
        // For now, if another meal IOB/COB stacks on top of it, consider them together
        // Compare beginning and ending BGs, and calculate how much more/less insulin is needed to neutralize
        // Use entered carbs vs. starting IOB + delivered insulin + needed-at-end insulin to directly calculate CR.

        if (mealCOB > 0 || calculatingCR ) {
            // set initial values when we first see COB
            CRCarbs += myCarbs;
            if (!calculatingCR) {
                var CRInitialIOB = iob.iob;
                var CRInitialBG = glucoseDatum.glucose;
                var CRInitialCarbTime = new Date(glucoseDatum.date);
                console.error("CRInitialIOB:",CRInitialIOB,"CRInitialBG:",CRInitialBG,"CRInitialCarbTime:",CRInitialCarbTime);
            }
            // keep calculatingCR as long as we have COB or enough IOB
            if ( mealCOB > 0 && i>1 ) {
                calculatingCR = true;
            } else if ( iob.iob > currentBasal/2 && i>1 ) {
                calculatingCR = true;
            // when COB=0 and IOB drops low enough, record end values and be done calculatingCR
            } else {
                var CREndIOB = iob.iob;
                var CREndBG = glucoseDatum.glucose;
                var CREndTime = new Date(glucoseDatum.date);
                console.error("CREndIOB:",CREndIOB,"CREndBG:",CREndBG,"CREndTime:",CREndTime);
                var CRDatum = {
                    CRInitialIOB: CRInitialIOB
                ,   CRInitialBG: CRInitialBG
                ,   CRInitialCarbTime: CRInitialCarbTime
                ,   CREndIOB: CREndIOB
                ,   CREndBG: CREndBG
                ,   CREndTime: CREndTime
                ,   CRCarbs: CRCarbs
                };
                //console.error(CRDatum);

                var CRElapsedMinutes = Math.round((CREndTime - CRInitialCarbTime) / 1000 / 60);
                //console.error(CREndTime - CRInitialCarbTime, CRElapsedMinutes);
                if ( CRElapsedMinutes < 60 || ( i===1 && mealCOB > 0 ) ) {
                    console.error("Ignoring",CRElapsedMinutes,"m CR period.");
                } else {
                    CRData.push(CRDatum);
                }

                CRCarbs = 0;
                calculatingCR = false;
            }
        }


        // If mealCOB is zero but all deviations since hitting COB=0 are positive, assign those data points to CSFGlucoseData
        // Once deviations go negative for at least one data point after COB=0, we can use the rest of the data to tune ISF or basals
        if (mealCOB > 0 || absorbing || mealCarbs > 0) {
            // if meal IOB has decayed, then end absorption after this data point unless COB > 0
            if ( iob.iob < currentBasal/2 ) {
                absorbing = 0;
            // otherwise, as long as deviations are positive, keep tracking carb deviations
            } else if (deviation > 0) {
                absorbing = 1;
            } else {
                absorbing = 0;
            }
            if ( ! absorbing && ! mealCOB ) {
                mealCarbs = 0;
            }
            // check previous "type" value, and if it wasn't csf, set a mealAbsorption start flag
            //console.error(type);
            if ( type !== "csf" ) {
                glucoseDatum.mealAbsorption = "start";
                console.error(glucoseDatum.mealAbsorption,"carb absorption");
            }
            type="csf";
            glucoseDatum.mealCarbs = mealCarbs;
            //if (i == 0) { glucoseDatum.mealAbsorption = "end"; }
            CSFGlucoseData.push(glucoseDatum);
        } else {
          // check previous "type" value, and if it was csf, set a mealAbsorption end flag
          if ( type === "csf" ) {
            CSFGlucoseData[CSFGlucoseData.length-1].mealAbsorption = "end";
            console.error(CSFGlucoseData[CSFGlucoseData.length-1].mealAbsorption,"carb absorption");
          }

          if ((iob.iob > 2 * currentBasal || deviation > 6 || uam) ) {
            if (deviation > 0) {
                uam = 1;
            } else {
                uam = 0;
            }
            if ( type !== "uam" ) {
                glucoseDatum.uamAbsorption = "start";
                console.error(glucoseDatum.uamAbsorption,"uannnounced meal absorption");
            }
            type="uam";
            UAMGlucoseData.push(glucoseDatum);
          } else {
            if ( type === "uam" ) {
                console.error("end unannounced meal absorption");
            }


            // Go through the remaining time periods and divide them into periods where scheduled basal insulin activity dominates. This would be determined by calculating the BG impact of scheduled basal insulin (for example 1U/hr * 48 mg/dL/U ISF = 48 mg/dL/hr = 5 mg/dL/5m), and comparing that to BGI from bolus and net basal insulin activity.
            // When BGI is positive (insulin activity is negative), we want to use that data to tune basals
            // When BGI is smaller than about 1/4 of basalBGI, we want to use that data to tune basals
            // When BGI is negative and more than about 1/4 of basalBGI, we can use that data to tune ISF,
            // unless avgDelta is positive: then that's some sort of unexplained rise we don't want to use for ISF, so that means basals
            if (basalBGI > -4 * BGI) {
                type="basal";
                basalGlucoseData.push(glucoseDatum);
            } else {
                if ( avgDelta > 0 && avgDelta > -2*BGI ) {
                    //type="unknown"
                    type="basal"
                    basalGlucoseData.push(glucoseDatum);
                } else {
                    type="ISF";
                    ISFGlucoseData.push(glucoseDatum);
                }
            }
          }
        }
        // debug line to print out all the things
        var BGDateArray = BGDate.toString().split(" ");
        BGTime = BGDateArray[4];
        // console.error(absorbing.toString(),"mealCOB:",mealCOB.toFixed(1),"mealCarbs:",mealCarbs,"basalBGI:",basalBGI.toFixed(1),"BGI:",BGI.toFixed(1),"IOB:",iob.iob.toFixed(1),"at",BGTime,"dev:",deviation,"avgDelta:",avgDelta,type);
        console.error(absorbing.toString(),"mealCOB:",mealCOB.toFixed(1),"mealCarbs:",mealCarbs,"BGI:",BGI.toFixed(1),"IOB:",iob.iob.toFixed(1),"at",BGTime,"dev:",dev5m,"avgDev:",deviation,"avgDelta:",avgDelta,type,BG,myCarbs);
    }

    IOBInputs = {
        profile: profileData
    ,   history: opts.pumpHistory
    };
    treatments = find_insulin(IOBInputs);
    CRData.forEach(function(CRDatum) {
        var dosedOpts = {
            treatments: treatments
            , profile: opts.profile
            , start: CRDatum.CRInitialCarbTime
            , end: CRDatum.CREndTime
        };
        var insulinDosed = dosed(dosedOpts);
        CRDatum.CRInsulin = insulinDosed.insulin;
        //console.error(CRDatum);
    });

    var CSFLength = CSFGlucoseData.length;
    var ISFLength = ISFGlucoseData.length;
    var UAMLength = UAMGlucoseData.length;
    var basalLength = basalGlucoseData.length;

    if (opts.categorize_uam_as_basal) {
        console.error("--categorize-uam-as-basal=true set: categorizing all UAM data as basal.");
        basalGlucoseData = basalGlucoseData.concat(UAMGlucoseData);
    } else if (CSFLength > 12) {
        console.error("Found at least 1h of carb absorption: assuming all meals were announced, and categorizing UAM data as basal.");
        basalGlucoseData = basalGlucoseData.concat(UAMGlucoseData);
    } else {
        if (2*basalLength < UAMLength) {
            //console.error(basalGlucoseData, UAMGlucoseData);
            console.error("Warning: too many deviations categorized as UnAnnounced Meals");
            console.error("Adding",UAMLength,"UAM deviations to",basalLength,"basal ones");
            basalGlucoseData = basalGlucoseData.concat(UAMGlucoseData);
            //console.error(basalGlucoseData);
            // if too much data is excluded as UAM, add in the UAM deviations to basal, but then discard the highest 50%
            basalGlucoseData.sort(function (a, b) {
                return a.deviation - b.deviation;
            });
            var newBasalGlucose = basalGlucoseData.slice(0,basalGlucoseData.length/2);
            //console.error(newBasalGlucose);
            basalGlucoseData = newBasalGlucose;
            console.error("and selecting the lowest 50%, leaving", basalGlucoseData.length, "basal+UAM ones");
        }

        if (2*ISFLength < UAMLength && ISFLength < 10) {
            console.error("Adding",UAMLength,"UAM deviations to",ISFLength,"ISF ones");
            ISFGlucoseData = ISFGlucoseData.concat(UAMGlucoseData);
            // if too much data is excluded as UAM, add in the UAM deviations to ISF, but then discard the highest 50%
            ISFGlucoseData.sort(function (a, b) {
                return a.deviation - b.deviation;
            });
            var newISFGlucose = ISFGlucoseData.slice(0,ISFGlucoseData.length/2);
            //console.error(newISFGlucose);
            ISFGlucoseData = newISFGlucose;
            console.error("and selecting the lowest 50%, leaving", ISFGlucoseData.length, "ISF+UAM ones");
            //console.error(ISFGlucoseData.length, UAMLength);
        }
    }
    basalLength = basalGlucoseData.length;
    ISFLength = ISFGlucoseData.length;
    if ( 4*basalLength + ISFLength < CSFLength && ISFLength < 10 ) {
        console.error("Warning: too many deviations categorized as meals");
        //console.error("Adding",CSFLength,"CSF deviations to",basalLength,"basal ones");
        //var basalGlucoseData = basalGlucoseData.concat(CSFGlucoseData);
        console.error("Adding",CSFLength,"CSF deviations to",ISFLength,"ISF ones");
        ISFGlucoseData = ISFGlucoseData.concat(CSFGlucoseData);
        CSFGlucoseData = [];
    }


    return {
        CRData: CRData,
        CSFGlucoseData: CSFGlucoseData,
        ISFGlucoseData: ISFGlucoseData,
        basalGlucoseData: basalGlucoseData
    };
}

exports = module.exports = categorizeBGDatums;
