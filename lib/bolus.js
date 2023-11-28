
/*
This JavaScript code comprises a function named `reduce`, which processes a collection of treatments related to an insulin delivery system:

- The `reduce` function takes an array of treatment events as input and processes them to generate a set of structured results.
- It defines helper functions:
  - `in_previous` checks if an event exists in a previous set of events within a given time frame.
  - `within_minutes_from` filters candidate events occurring within a specified time frame from a given origin event.
  - `bolus` processes bolus-related events (e.g., BolusWizard, Bolus) to calculate insulin and carb-related information, annotates data, and generates structured results.
  - `annotate` adds annotation messages to the state object.
  - `step` is a helper function to process individual treatment events based on their types (e.g., Bolus, BolusWizard, JournalEntryMealMarker).
- The `reduce` function iterates through the input `treatments` array, processing each event and generating a structured `results` array that includes information such as insulin amounts, carb input, event types, and annotations.
- The generated `results` array contains structured objects with details on bolus events, carb corrections, insulin amounts, target glucose levels, and related annotations derived from the input treatment events.
- This code appears to be part of a data processing pipeline related to an insulin delivery system, likely used to aggregate and structure treatment data for analysis or reporting purposes.
*/


'use strict';

function reduce (treatments) {

  var results = [ ];

  var state = { };
  var previous = [ ];

  function in_previous (ev) {
    var found = false;
    previous.forEach(function (elem) {
      if (elem.timestamp === ev.timestamp && ev._type === elem._type) {
        found = true;
      }
    });

    return found;
  }

  function within_minutes_from (origin, tail, minutes) {
    var ms = minutes * 1000 * 60;
    var ts = Date.parse(origin.timestamp);
    return /* candidates */ tail.slice( ).filter(function (elem) {
      var dt = Date.parse(elem.timestamp);
      return ts - dt <= ms;
    });
  }

  function bolus (ev, remaining) {
    if (!ev) { console.error('XXX', ev, remaining); return; }
    if (ev._type === 'BolusWizard') {
      state.carbs = ev.carb_input.toString( );
      state.ratio = ev.carb_ratio.toString( );
      if (ev.bg) {
        state.bg = ev.bg.toString( );
        state.glucose = ev.bg.toString( );
        state.glucoseType = ev._type;
      }
      state.wizard = ev;
      state.created_at = state.timestamp = ev.timestamp;
      previous.push(ev);
    }

    if (ev._type === 'Bolus') {
      state.duration = ev.duration.toString( );
      // if (state.square || state.bolus) { }
      // state.insulin = (state.insulin ? state.insulin : 0) + ev.amount;
      if (ev.duration && ev.duration > 0) {
        state.square = ev;
      } else {
        if (state.bolus) {
          state.bolus.amount = state.bolus.amount + ev.amount;
        } else
          state.bolus = ev;
      }
      state.created_at = state.timestamp = ev.timestamp;
      previous.push(ev);
    }

    if (remaining && remaining.length > 0) {
      if (state.bolus && state.wizard) {
        // skip to end
        return bolus({}, []);
      }
      // keep recursing
      return bolus(remaining[0], remaining.slice(1));
    } else {
      // console.error("state", state);
      // console.error("remaining", remaining);
      state.eventType = '<none>';

      state.insulin = (state.insulin ? state.insulin : 0) + (state.square ? state.square.amount : 0) +
            (state.bolus ? state.bolus.amount : 0);
      var has_insulin = state.insulin && state.insulin > 0;
      var has_carbs = state.carbs && state.carbs > 0;
      if (state.square && state.bolus) {
        annotate("DualWave bolus for", state.square.duration, "minutes");
      } else if (state.square && state.wizard) {
        annotate("Square wave bolus for", state.square.duration, "minutes");
      } else if (state.square) {
        annotate("Solo Square wave bolus for", state.square.duration, "minutes");
        annotate("No bolus wizard used.");
      } else if (state.bolus && state.wizard) {
        annotate("Normal bolus with wizard.");
      } else if (state.bolus) {
        annotate("Normal bolus (solo, no bolus wizard).");
      }

      if (has_insulin) {
        var iobFile = "./monitor/iob.json";
        var fs = require('fs');
        if (fs.existsSync(iobFile)) {
            var iob = JSON.parse(fs.readFileSync(iobFile));
            if (iob && Array.isArray(iob) && iob.length) {
                annotate("Calculated IOB:", iob[0].iob);
            }
        }
      }

      if (state.bolus) {
        annotate("Programmed bolus", state.bolus.programmed);
        annotate("Delivered bolus", state.bolus.amount);
        annotate("Percent delivered: ", (state.bolus.amount/state.bolus.programmed * 100).toString( ) + '%');
      }
      if (state.square) {
        annotate("Programmed square", state.square.programmed);
        annotate("Delivered square", state.square.amount);
        annotate("Success: ", (state.square.amount/state.square.programmed * 100).toString( ) + '%');
      }
      if (state.wizard) {
        state.created_at = state.wizard.timestamp;
        annotate("Food estimate", state.wizard.food_estimate);
        annotate("Correction estimate", state.wizard.correction_estimate);
        annotate("Bolus estimate", state.wizard.bolus_estimate);
        annotate("Target low", state.wizard.bg_target_low);
        annotate("Target high", state.wizard.bg_target_high);
        var delta = state.wizard.sensitivity * state.insulin * -1;
        annotate("Hypothetical glucose delta", delta);
        if (state.bg && state.bg > 0) {
          annotate('Glucose was:', state.bg);
          // state.glucose = state.bg;
          // TODO: annotate prediction
        }
      }
      if (has_carbs && has_insulin) {
        state.eventType = 'Meal Bolus';
      } else {
        if (has_carbs && !has_insulin) {
          state.eventType = 'Carb Correction';
        }
        if (!has_carbs && has_insulin) {
          state.eventType = 'Correction Bolus';
        }
      }
      if (state.notes && state.notes.length > 0) {
        state.notes = state.notes.join("\n");
      }
      if (state.insulin) {
        state.insulin = state.insulin.toString( );
      }

      results.push(state);
      state = { };
    }
  }

  function annotate (msg) {
    var args = [ ].slice.apply(arguments);
    msg = args.join(' ');
    if (!state.notes) {
      state.notes = [ ];
    }
    state.notes.push(msg);
  }

  function step (current, index) {
    if (in_previous(current)) {
      return;
    }
    switch (current._type) {
      case 'Bolus':
      case 'BolusWizard':
        var tail = within_minutes_from(current, treatments.slice(index+1), 2);
        bolus(current, tail);
        break;
      case 'JournalEntryMealMarker':
        current.carbs = current.carb_input;
        current.eventType = 'Carb Correction';
        results.push(current);
        break;
      default:
        results.push(current);
        break;
    }
  }
  treatments.forEach(step);
  return results;
}

exports = module.exports = reduce;
