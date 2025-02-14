/*
This Bash script, a part of oref0, converts Medtronic pump history data into Nightscout treatments data.

The script takes Medtronic pump history data in JSON format and processes it to generate Nightscout treatments data. It performs the following operations using jq, a command-line JSON processor:
1. Retrieves event preferences from the Nightscout preferences JSON file to identify specific events (such as cartridge changes, site changes, battery changes) from the pump history.
2. Processes the pump history data, normalizes temperature basal rates, and maps Medtronic-specific event types to Nightscout treatments data. It formats and organizes the data according to Nightscout's required structure, including setting event types, timestamps, notes, and other metadata.
3. Generates a new JSON document in a format suitable for Nightscout treatments data.

The resulting output is a JSON document compatible with Nightscout, containing structured treatments data that can be visualized or used for analysis within the Nightscout platform.
*/


#!/usr/bin/env bash

# Author: Ben West

source $(dirname $0)/oref0-bash-common-functions.sh || (echo "ERROR: Failed to run oref0-bash-common-functions.sh. Is oref0 correctly installed?"; exit 1)

HISTORY=${1-monitor/pump-history-zoned.json}
MODEL=${2-model.json}
OUTPUT=${3-/dev/fd/1}
#TZ=${3-$(date +%z)}

usage "$@" <<EOT
Usage: $self <pump-history-zoned.json> <model.json>
Format medtronic history data into Nightscout treatments data.
EOT


# | json -e "this.type = 'mm://openaps/$self'" \
model=$(jq -r . $MODEL)

#load ns event preferences
PREF=${4-preferences.json}
rewind_indicates_cartridge_change=$(jq -r .rewind_indicates_cartridge_change $PREF)
prime_indicates_pump_site_change=$(jq -r .prime_indicates_pump_site_change $PREF)
battery_indicates_battery_change=$(jq -r .battery_indicates_battery_change $PREF)

run_remote_command "oref0-normalize-temps $HISTORY" \
  | jq '[ .[]
    | .medtronic = ( [ "mm://openaps/'$self'/", ( . | if ._type then ._type else .eventType end ) ] | join("") )
    | .created_at = if .created_at then .created_at else .timestamp end
    | .enteredBy = "openaps://medtronic/'$model'"
    | if .glucose and (.glucoseType | not) and .glucose > 0 then .glucoseType = .enteredBy else . end
    | if ._type == "Rewind" and "'$rewind_indicates_cartridge_change'" == "true" then .eventType = "Insulin Change" else . end
    | if ._type == "Prime" and .type == "fixed" and "'$prime_indicates_pump_site_change'" == "true" then .eventType = "Site Change" else . end
    | if ._type == "Battery" and "'$battery_indicates_battery_change'" == "true" then .eventType = "Pump Battery Change" else . end
    | .eventType = if .eventType then .eventType else "Note" end
    | if ._type == "AlarmSensor" and .alarm_description then .notes = .alarm_description else . end
    | ( if .notes then .notes else "" end ) as $note
    | if ( .eventType == "Note" or .eventType == "Insulin Change" or .eventType == "Site Change" or .eventType == "Pump Battery Change" ) and ( .alarm_description | not ) then .notes = ( [ ._type, "'" $model "'", $note ] | join("") ) else . end
  ]' \
  > $OUTPUT

