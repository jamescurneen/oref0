
/*
This Bash script, part of oref0, converts Medtronic glucose data into a format suitable for Nightscout, a web-based continuous glucose monitoring system.

- It retrieves input data in JSON format from a Medtronic device.
- Utilizes jq, a command-line JSON processor, to transform and reformat the Medtronic glucose data.
- Generates Nightscout-compatible JSON output containing transformed glucose data entries.
- Provides options to filter only glucose values for Nightscout using the "--oref0" flag.

The script leverages jq and various JSON manipulations to extract and restructure glucose data, enabling compatibility between Medtronic data and Nightscout, facilitating visualization and monitoring of glucose values.
*/




#!/usr/bin/env bash

# Author: Ben West @bewest
# Maintainer: Chris Oattes @cjo20

# Written for decocare v0.0.17. Will need updating the the decocare json format changes.

source $(dirname $0)/oref0-bash-common-functions.sh || (echo "ERROR: Failed to run oref0-bash-common-functions.sh. Is oref0 correctly installed?"; exit 1)

usage "$@" <<EOT
Usage: $self [--oref0] <medtronic-glucose.json>
Format Medtronic glucose data into something acceptable to Nightscout.
EOT

NSONLY=""
test "$1" = "--oref0" && NSONLY="| .glucose = .sgv" && shift

HISTORY=${1-glucosehistory.json}
OUTPUT=${2-/dev/fd/1}
#TZ=${3-$(date +%z)}


cat $HISTORY | \
  jq '[ .[]
    | if ._type then .medtronic = ._type else . end
    | if ( ( .dateString | not ) and ( .date | tostring | test(":") ) ) then
            .dateString = ( [ ( .date | tostring), "'$(date +%z)'" ] | join("") ) else . end
    | ( .dateString | sub("Z"; "") | split(".") )[0] as $time
    | ( ( .dateString | sub("Z"; "") | split(".") )[1] | tonumber ) as $msec
    | .date = ( ( [ $time, "Z" ] | join("") ) | fromdateiso8601 ) * 1000 + $msec
    | .type = if .name and (.name | test("GlucoseSensorData")) then "sgv" else "pumpdata" end
    | .device = "openaps://medtronic/pump/cgm"
    '"$NSONLY"' ]' > $OUTPUT

