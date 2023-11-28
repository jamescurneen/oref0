'use strict';

/**
 * Returns the value at a given percentile in a sorted numeric array using linear interpolation between closest ranks.
 * The function calculates the value at a specified percentile 'p' within the provided sorted array 'arr'.
 *
 * @param {number[]} arr - The sorted numeric array.
 * @param {number} p - The percentile value (between 0 and 1) for which the corresponding value is to be computed.
 * @returns {number} - The value at the specified percentile in the array.
 * @throws {TypeError} - Throws an error if 'p' is not a number.
 */

module.exports = function percentile(arr, p) {
    // If the array is empty, return 0
    if (arr.length === 0) return 0;

    // Check if 'p' is not a number, throw a TypeError
    if (typeof p !== 'number') throw new TypeError('p must be a number');

    // Return the first element of the array if 'p' is less than or equal to 0
    if (p <= 0) return arr[0];

    // Return the last element of the array if 'p' is greater than or equal to 1
    if (p >= 1) return arr[arr.length - 1];

    // Calculate the index based on the percentile 'p'
    var index = arr.length * p,
        lower = Math.floor(index),
        upper = lower + 1,
        weight = index % 1;

    // If the upper index is beyond the array length, return the value at the lower index
    if (upper >= arr.length) return arr[lower];

    // Calculate the interpolated value between the two closest ranks
    return arr[lower] * (1 - weight) + arr[upper] * weight;
};


'use strict';
// From https://gist.github.com/IceCreamYou/6ffa1b18c4c8f6aeaad2
// Returns the value at a given percentile in a sorted numeric array.
// "Linear interpolation between closest ranks" method
module.exports = function percentile(arr, p) {
    if (arr.length === 0) return 0;
    if (typeof p !== 'number') throw new TypeError('p must be a number');
    if (p <= 0) return arr[0];
    if (p >= 1) return arr[arr.length - 1];

    var index = arr.length * p,
        lower = Math.floor(index),
        upper = lower + 1,
        weight = index % 1;

    if (upper >= arr.length) return arr[lower];
    return arr[lower] * (1 - weight) + arr[upper] * weight;
}
