/*
This AWK script, a part of oref0, processes input data representing blood glucose readings and calculates various statistical measures:

1. Initializes variables for minimum and default blood glucose levels.
2. Accumulates sum, count, and squares of input values for statistical calculations.
3. Determines the minimum and maximum blood glucose readings, excluding values below 39.
4. Tracks the count of values within specific blood glucose ranges (low, in-range, high).
5. Calculates and prints statistical measures: count, minimum, maximum, average, standard deviation, and percentages of time in range (TIR), low, and high values within specified blood glucose ranges (min_bg - max_bg).

The script primarily processes blood glucose data, computes statistical metrics, and provides insights into the distribution of blood glucose readings within predefined ranges, aiming to offer insights into glycemic control.
*/



BEGIN {
    min=1000
    if (!min_bg) { min_bg=70 }
    if (!max_bg) { max_bg=180 }
}
{ sum+=$1; count++; squares+=$1^2; }
($1 < 39) { next }
($1 < min) { min=$1 }
($1 > max) { max=$1 }
($1 <= max_bg && $1 >= min_bg) { inrange++ }
($1 > max_bg) { high++ }
($1 < min_bg) { low++ }
END { # print "Count: " count;
    printf "Count %.0f / Min %.0f / Max %.0f / Average %.1f / StdDev %.1f / ", count, min, max, sum/count, sqrt(squares/count-(sum/count)^2)
    #printf "%%TIR / low / high (%.0f-%.0f): ", min_bg, max_bg
    printf "%.1f%% TIR / %.1f%% low / %.1f%% high (%.0f-%.0f)\n", inrange/(high+inrange+low)*100, low/(high+inrange+low)*100, high/(high+inrange+low)*100, min_bg, max_bg
    printf "%.0f,%.1f,%.1f,%.1f,%.1f", count, sum/count, low/(high+inrange+low)*100, high/(high+inrange+low)*100, sqrt(squares/count-(sum/count)^2)
}
