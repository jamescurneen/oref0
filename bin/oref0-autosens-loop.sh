/*
  This Bash script, oref0-autosens-loop, is a part of oref0 (OpenAPS Reference Design) and serves as a loop for the automatic detection of insulin sensitivity (autosens) in an artificial pancreas system.

  Functionality:
  - Checks various conditions (e.g., CPU temperature, load) before executing autosens.
  - Runs autosens only if specific conditions are met (e.g., pumphistory-24h is newer than autosens, or autosens.json is missing or empty).
  - Executes oref0-detect-sensitivity using specific input files to refresh autosens.json, which contains insulin sensitivity ratios.
  - Handles refreshing autosens or maintaining the current autosens.json based on the outcome of oref0-detect-sensitivity.
  - Generates logs indicating the status of autosens refresh.

  Usage:
  - The script can be executed without any arguments.
  - It checks the conditions for running autosens and refreshes autosens.json if necessary.

  Note:
  - This script is a critical part of an artificial pancreas system and contributes to the continuous monitoring and adjustment of insulin sensitivity in response to changing conditions.
*/



#!/usr/bin/env bash

source $(dirname $0)/oref0-bash-common-functions.sh || (echo "ERROR: Failed to run oref0-bash-common-functions.sh. Is oref0 correctly installed?"; exit 1)

main() {
    echo
    echo Starting oref0-autosens-loop at $(date):
    overtemp && exit 1
    if highload && completed_recently; then
        echo Load high at $(date): waiting up to 30m to continue
        exit 2
    fi

    autosens 2>&1
    touch /tmp/autosens-completed
    echo Completed oref0-autosens-loop at $(date)
}

usage "$@" <<EOT
Usage: $self
Autosens loop. Checks (once) how long it's been since autosens has run, checks
for various trouble conditions (high load, high CPU temperature), and if it's
been 30 minutes since autosens has run and everything is okay, runs
oref0-detect-sensitivity. Working directory should be myopenaps.
EOT


function completed_recently {
    file_is_recent /tmp/autosens-completed 30
}

# find settings/ -newer settings/autosens.json | grep -q pumphistory-24h-zoned.json || find settings/ -size -5c | grep -q autosens.json || ! find settings/ | grep -q autosens || ! find settings/autosens.json
# openaps use detect-sensitivity shell monitor/glucose.json settings/pumphistory-24h-zoned.json settings/insulin_sensitivities.json settings/basal_profile.json settings/profile.json monitor/carbhistory.json settings/temptargets.json
function autosens {
    # only run autosens if pumphistory-24h is newer than autosens
    if find monitor/ -newer settings/autosens.json | grep pumphistory-24h-zoned.json \
        || find settings/ -size -5c | grep autosens.json \
        || ! find settings/ | grep autosens \
        || ! find settings/autosens.json >/dev/null; then
        if oref0-detect-sensitivity monitor/glucose.json monitor/pumphistory-24h-zoned.json settings/insulin_sensitivities.json settings/basal_profile.json settings/profile.json monitor/carbhistory.json settings/temptargets.json > settings/autosens.json.new && cat settings/autosens.json.new | jq .ratio | grep "[0-9]"; then
            mv settings/autosens.json.new settings/autosens.json
            echo -n "Autosens refreshed: "
        else
            echo -n "Failed to refresh autosens: using old autosens.json: "
        fi
    else
        echo -n "No need to refresh autosens yet: "
    fi
    cat settings/autosens.json | colorize_json
}

main "$@"
