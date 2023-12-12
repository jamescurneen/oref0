/*
  This Bash script, part of oref0, facilitates the upload of glucose entries (contained in a JSON file) to Nightscout (NS) using its API.
  
  The script takes entries (glucose data) stored in a JSON file and uploads them to the specified Nightscout host.
  
  Arguments:
  - entries.json: JSON file containing glucose entries to be uploaded.
  - http://nightscout.host:1337: Nightscout host with its respective port (default: localhost:1337) where the entries will be uploaded.
  
  Usage:
  The script can be used via the command line by providing the entries file path and the Nightscout host URL as arguments.
  
  Functionality:
  - Checks for API_SECRET and NIGHTSCOUT_HOST variables set in the calling environment.
  - Constructs the REST_ENDPOINT for uploading entries to Nightscout, taking into account API_SECRET authentication.
  - Executes a cURL command to POST the entries data to the Nightscout REST API.
  - Logs the upload status and touches an OUTPUT file (if specified) to indicate a successful upload.
*/


#!/usr/bin/env bash

# Author: Ben West
# Maintainer: @cjo20, @scottleibrand

source $(dirname $0)/oref0-bash-common-functions.sh || (echo "ERROR: Failed to run oref0-bash-common-functions.sh. Is oref0 correctly installed?"; exit 1)

ENTRIES=${1-entries.json}
NIGHTSCOUT_HOST=${NIGHTSCOUT_HOST-localhost:1337}
OUTPUT=${2}

usage "$@" <<EOF
Usage: $self <entries.json> <http://nightscout.host:1337>
Upload entries (glucose data) to NS.
EOF

export ENTRIES API_SECRET NIGHTSCOUT_HOST

# use token authentication if the user has a token set in their API_SECRET environment variable
if [[ "${API_SECRET,,}" =~ "token=" ]]; then
  API_SECRET_HEADER=""
  REST_ENDPOINT="${NIGHTSCOUT_HOST}/api/v1/entries.json?${API_SECRET}"
else
  REST_ENDPOINT="${NIGHTSCOUT_HOST}/api/v1/entries.json"
  API_SECRET_HEADER='-H "API-SECRET: ${API_SECRET}"'
fi


# requires API_SECRET and NIGHTSCOUT_HOST to be set in calling environment (i.e. in crontab)
(
curl -m 30 -s -X POST --data-binary @${ENTRIES} \
  ${API_SECRET_HEADER}  -H "content-type: application/json" \
  ${REST_ENDPOINT}
) && ( test -n "${OUTPUT}" && touch ${OUTPUT} ; logger "Uploaded ${ENTRIES} to ${NIGHTSCOUT_HOST}" ) || logger "Unable to upload to ${NIGHTSCOUT_HOST}"

