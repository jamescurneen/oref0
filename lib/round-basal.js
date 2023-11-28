/*
This JavaScript code defines a function called round_basal, meant to round a given basal insulin rate according to specific rules.

- The round_basal function takes two parameters: basal (the basal insulin value to be rounded) and profile (an optional object containing pump profile information).
- It determines the lowest_rate_scale based on the pump model specified in the profile. If the model ends with "54" or "23", it sets lowest_rate_scale to 40; otherwise, it remains at the default value of 20.
- The function then checks the basal value and rounds it based on specific conditions:
  - If basal is less than 1, it uses the lowest_rate_scale to round the value.
  - If basal is between 1 and 10, it rounds to the nearest 0.05 units (20 increments per unit).
  - If basal is greater than or equal to 10, it rounds to the nearest 0.1 units (10 increments per unit).
- The rounded value is returned by the function.

The code uses the endsWith function from the Lodash library to check the pump model string. After defining the round_basal function, it exports it to be used in other modules (exports = module.exports = round_basal). This allows other parts of the program to access and use this rounding function for basal insulin rates.
*/



var endsWith = require('lodash/endsWith');

var round_basal = function round_basal(basal, profile) {

    /* x23 and x54 pumps change basal increment depending on how much basal is being delivered:
            0.025u for 0.025 < x < 0.975
            0.05u for 1 < x < 9.95
            0.1u for 10 < x
      To round numbers nicely for the pump, use a scale factor of (1 / increment). */

    var lowest_rate_scale = 20;

    // Has profile even been passed in?
    if (typeof profile !== 'undefined')
    {
        // Make sure optional model has been set
        if (typeof profile.model === 'string')
        {
            if (endsWith(profile.model, "54") || endsWith(profile.model, "23"))
            {
                lowest_rate_scale = 40;
            }
        }
    }

    var rounded_basal = basal;
    // Shouldn't need to check against 0 as pumps can't deliver negative basal anyway?
    if (basal < 1)
    {
        rounded_basal = Math.round(basal * lowest_rate_scale) / lowest_rate_scale;
    }
    else if (basal < 10)
    {
        rounded_basal = Math.round(basal * 20) / 20;
    }
    else
    {
        rounded_basal = Math.round(basal * 10) / 10;
    }

    return rounded_basal;
}

exports = module.exports = round_basal
