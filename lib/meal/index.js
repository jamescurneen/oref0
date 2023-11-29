
/*
  This JavaScript module exports a function named 'generate' responsible for generating meal-related data
  based on inputs provided to the function. The function utilizes other modules such as 'find_meals' and 'sum'
  to process the provided inputs and compute meal-related information.

  Key Functions:
  - 'generate(inputs)': Computes meal-related data based on the provided inputs.

  The 'generate' function performs the following steps:
  1. Retrieves meal-related treatments using the 'find_meals' module based on the provided 'inputs'.
  2. Constructs options ('opts') containing treatments, profiles, pump history, glucose data, and basal profiles.
  3. Converts the input clock to a date object adjusted with timezone information using 'moment-timezone'.
  4. Returns computed meal data by invoking the 'sum' function with the constructed options and adjusted clock.

  This code module plays a pivotal role in processing inputs to derive meal-related information by utilizing
  other modules to aggregate and analyze data related to meals, profiles, and historical information. It's a
  part of a system for managing diabetes that computes meal-related data essential for treatment decisions.
*/




'use strict';

var tz = require('moment-timezone');
var find_meals = require('./history');
var sum = require('./total');

function generate (inputs) {

  var treatments = find_meals(inputs);

  var opts = {
    treatments: treatments
  , profile: inputs.profile
  , pumphistory: inputs.history
  , glucose: inputs.glucose
  , basalprofile: inputs.basalprofile
  };

  var clock = new Date(tz(inputs.clock));

  return /* meal_data */ sum(opts, clock);
}

exports = module.exports = generate;
