/**
 * This module provides utility functions for safe file operations and requiring files, along with test functionalities.
 * 
 * Functions:
 * 
 * - safeRequire(path): A function that safely attempts to require a module given its 'path'. 
 *                      It handles any potential errors that may occur during the 'require' process.
 * 
 * - safeLoadFile(path): A function that safely loads and parses a JSON file from the provided 'path'.
 *                       It reads the file content, parses it as JSON, and handles any potential errors that may occur.
 * 
 * - requireWithTimestamp(path): A function that safely loads a JSON file from 'path' and adds a 'timestamp' property 
 *                               with the file's modification time (mtime) using 'fs.statSync'.
 * 
 * Testing Methods:
 * 
 * - compareMethods(path): A test method that compares the output of 'safeLoadFile' with 'safeRequire' for a given 'path'.
 *                         It verifies whether the loaded JSON object matches the required module content.
 * 
 * Module Test (Run when called directly):
 * 
 * The module includes a set of tests to validate the functionalities of the functions defined within it:
 * - Writes a file, tests it using 'compareMethods'.
 * - Checks for a non-existing file using 'compareMethods'.
 * - Checks for a file with a malformed JSON format using 'compareMethods'.
 * - Rewrites a file and reads its content to ensure proper overwrite and rereading.
 * 
 * Note: The testing section ('module.parent') runs only when this script is executed directly.
 * 
 * @module fileUtils
 */





'use strict';

var fs = require('fs');

function safeRequire (path) {
  var resolved;

  try {
    resolved = require(path);
  } catch (e) {
    console.error("Could not require: " + path, e);
  }

  return resolved;
}

function safeLoadFile(path) {
  
  var resolved;

  try {
    resolved = JSON.parse(fs.readFileSync(path, 'utf8'));
    //console.log('content = ' , resolved);
  } catch (e) {
    console.error("Could not require: " + path, e);
  }
  return resolved;
}

function requireWithTimestamp (path) {
  var resolved = safeLoadFile(path);

  if (resolved) {
    resolved.timestamp = fs.statSync(path).mtime;
  }
  return resolved;
}

// Functions that are needed in order to test the module. Can be removed in the future.

function compareMethods(path) {
  var new_data = safeLoadFile(path);
  var old_data = safeRequire(path);
  if (JSON.stringify(new_data) === JSON.stringify(old_data) ) {
    console.log("test passed", new_data, old_data); 
  } else {
    console.log("test failed"); 
  }
}

// Module tests.
if (!module.parent) {
 // Write the first file: and test it.
 var obj = {x: "x", y: 1}
 fs.writeFileSync('/tmp/file1.json', JSON.stringify(obj));
 compareMethods('/tmp/file1.json');

  // Check a non existing object.
  compareMethods('/tmp/not_exist.json');
  
  // check a file that is not formated well.
  fs.writeFileSync('/tmp/bad.json', '{"x":"x","y":1');
  compareMethods('/tmp/bad.json');

  // Rewrite the file and reread it.
  var new_obj = {x: "x", y: 2}
  fs.writeFileSync('/tmp/file1.json', JSON.stringify(new_obj));
  var obj_read = safeLoadFile('/tmp/file1.json');
  if (JSON.stringify(new_obj) === JSON.stringify(obj_read) ) {
    console.log("test passed"); 
  } else {
    console.log("test failed"); 
  }

}

module.exports = {
  safeRequire: safeRequire
  , requireWithTimestamp: requireWithTimestamp
  , safeLoadFile: safeLoadFile
};
