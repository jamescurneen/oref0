/*
This Bash script, part of oref0, formats Medtronic pump-history data into a format compatible with Nightscout.

The script takes Medtronic pump history data (in JSON format) and transforms it into a Nightscout-compatible format. It performs the following operations using jq, a command-line JSON processor:
1. Maps fields from the Medtronic pump history to a format understandable by Nightscout, including converting timestamp fields and adjusting the data structure.
2. Generates a new JSON document with modified field names and a suitable structure for Nightscout.

The resulting output is a Nightscout-acceptable JSON document that can be used for visualization or analysis within the Nightscout platform.
*/


#!/usr/bin/env bash

# Author: Ben West
# Maintainer: Scott Leibrand

source $(dirname $0)/oref0-bash-common-functions.sh || (echo "ERROR: Failed to run oref0-bash-common-functions.sh. Is oref0 correctly installed?"; exit 1)

usage "$@" <<EOT
Usage: $self <medtronic-pump-history.json>
Format Medtronic pump-history data into something acceptable to Nightscout.
EOT


HISTORY=${1-pumphistory.json}
OUTPUT=${2-/dev/fd/1}
#TZ=${3-$(date +%z)}

cat $HISTORY | \
  jq '[ .[]
    | .medtronic = ._type
    | .dateString = .timestamp
    | .type = "medtronic"
    | ( .dateString | split(":") | .[0:3] | join(":") ) as $first
    | ( .dateString | split(":") | .[4] ) as $last
    | .date = if .date then .date else [$first, $last] | join("") | strptime("%Y-%m-%dT%H:%M:%S%z") | mktime end ]' \
  > $OUTPUT

