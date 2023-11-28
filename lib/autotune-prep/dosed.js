/**
 * @module insulinDosed
 * 
 * This module exports a function 'insulinDosed' that calculates the total amount of insulin dosed
 * within a specified time range based on the provided treatments and time interval.
 * 
 * Function Description:
 * 
 * - The function takes an object 'opts' containing start and end times, treatments data, and profile data.
 * 
 * - It extracts the start and end times in milliseconds from the 'opts' object.
 * 
 * - It processes the 'treatments' array to find insulin dosages that fall within the specified time range.
 * 
 * - For each treatment, it checks if it contains an 'insulin' property and if its 'date' falls within the given time interval.
 * 
 * - If a treatment meets the criteria, it adds the insulin dosage to the 'insulinDosed' variable.
 * 
 * - Finally, it returns an object containing the total insulin dosed within the specified time range, rounded to three decimal places.
 * 
 * Usage:
 * 
 * - Include this module in your code to calculate the total insulin dosed within a specific time period
 *   based on treatments and time range provided.
 * 
 * @param {Object} opts - An object containing start and end times (in milliseconds), treatments array, and profile data.
 * @returns {Object} - An object with the total insulin dosed within the specified time range.
 */


function insulinDosed(opts) {

    var start = opts.start.getTime();
    var end = opts.end.getTime();
    var treatments = opts.treatments;
    var profile_data = opts.profile;
    var insulinDosed = 0;
    if (!treatments) {
        console.error("No treatments to process.");
        return {};
    }

    treatments.forEach(function(treatment) {
        //console.error(treatment);
        if(treatment.insulin && treatment.date > start && treatment.date <= end) {
            insulinDosed += treatment.insulin;
        }
    });
    //console.error(insulinDosed);

    return {
        insulin: Math.round( insulinDosed * 1000 ) / 1000
    };
}

exports = module.exports = insulinDosed;
