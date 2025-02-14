/*
This Bash script, part of oref0, is designed to format Medtronic glucose history data into the oref0 format.

The script takes Medtronic glucose history data in JSON format and processes it using jq, a command-line JSON processor. Here's what it does:
1. Retrieves Medtronic-specific data fields and modifies them, such as appending Medtronic-specific information, setting data type based on field values, and adding device information.
2. Checks and formats date-related fields ('dateString' and 'date') to make them compatible with oref0 format.
3. Generates a new JSON document containing the processed data, formatted according to oref0 specifications.

The resulting output is a modified JSON document that conforms to the oref0 format, ready for further processing or analysis within the context of oref0 or related systems.
*/


#!/usr/bin/env bash

# Author: Ben West @bewest
# Maintainer: @tghoward

# Written for decocare v0.0.18. Will need updating the the decocare json format changes.

source $(dirname $0)/oref0-bash-common-functions.sh || (echo "ERROR: Failed to run oref0-bash-common-functions.sh. Is oref0 correctly installed?"; exit 1)

HISTORY=${1-glucosehistory.json}
OUTPUT=${2-/dev/fd/1}
#TZ=${3-$(date +%z)}
usage "$@" <<EOT
Usage: $self <glucose-history.json>
Format medtronic glucose data into oref0 format.
EOT

cat $HISTORY | \
  jq '[ .[]
    | .medtronic = ._type
    | if ( ( .dateString | not ) and ( .date | tostring | test(":") ) ) then
      .dateString = ( [ .date, "'$(date +%z)'" ] | join("") ) else . end
    | if ( ( .dateString | not ) and ( .date | test(".") | not ) ) then .dateString = ( .date | todate ) else . end
    | if .date | tostring | test(":") then .date = ( .dateString | strptime("%Y-%m-%dT%H:%M:%S%z") | mktime * 1000 ) else . end
    | .type = if .name and (.name | test("GlucoseSensorData")) then "sgv" else "pumpdata" end
    | .device = "openaps://medtronic/pump/cgm" ]' \
   > $OUTPUT

