/*
  This Bash script is used to set a temporary target by formatting it as JSON and storing it in 'settings/local-temptargets.json'. The pump loop in OpenAPS will find this file on its next iteration.

  Functionality:
  - Takes command-line arguments or reads JSON from stdin to create a temporary target configuration.
  - If no arguments are provided, it expects JSON input via stdin. With one argument, it treats it as a filename containing JSON data.
  - If two or more arguments are provided, it runs the 'oref0-set-local-temptarget.js' script, forwarding all arguments, and the input becomes the output of that script.
  - Writes the resultant JSON to '/tmp/temptarget.json'.
  - Merges the new temporary target JSON with existing data in 'settings/local-temptargets.json' using 'jq' and writes it back to the same file.

  Note:
  - This script acts as a pipeline, taking JSON input from various sources and merging it with existing target settings in 'settings/local-temptargets.json' for temporary configuration.
*/



#!/usr/bin/env bash

source $(dirname $0)/oref0-bash-common-functions.sh || (echo "ERROR: Failed to run oref0-bash-common-functions.sh. Is oref0 correctly installed?"; exit 1)

usage "$@" <<EOT
Usage: $self -|<filename>|<target> <duration> [starttime]

Set a temporary target, by formatting it as JSON and storing it in
settings/local-temptargets.json where the pump loop will find it on its next
iteration.

If no arguments are given, expects JSON on stdin. If one argument is given,
it's the name of a file containing JSON describing a temporary target. If two
or more arguments, they are a target, duration, and optional start time (as
with oref0-set-local-temptarget.js).
EOT


if [[ ! -z "$2" ]]; then
    # If two or more arguments, runs oref0-set-local-temptarget.js forwarding
    # all its arguments, and input is the output of that.
    input=$(oref0-set-local-temptarget $@)
elif [[ ! -z "$1" ]]; then
    # If exactly one argument, it's a filename
    input=$(cat $1)
else
    # If no arguments, act like a filter
    input=$(cat /dev/stdin)
fi
#cat "${1:-/dev/stdin}" \
echo $input \
    | tee /tmp/temptarget.json \
    && jq -s '[.[0]] + .[1]' /tmp/temptarget.json settings/local-temptargets.json \
    | tee settings/local-temptargets.json.new \
    && mv settings/local-temptargets.json.new settings/local-temptargets.json
