/*
This Bash script, a part of oref0, facilitates the identification and deletion of duplicate entries in a Nightscout instance.

The script provides the following operations:
- `--find <NIGHTSCOUT_HOST>`: No-op version, reveals what delete would do.
- `--list <NIGHTSCOUT_HOST>`: Lists duplicate count per 'created_at' timestamp.
- `delete <NIGHTSCOUT_HOST>`: Deletes duplicate entries from the specified Nightscout host.

It defines functions to:
- `fetch`: Retrieves data from the specified Nightscout host.
- `flatten`: Flattens fetched data and extracts the 'created_at' field.
- `find_dupes_on`: Finds duplicates based on 'created_at' timestamp and initiates deletion operations.
- `debug_cmd`: Constructs a debug command for deletion.
- `delete_cmd`: Performs deletion via a DELETE request.
- `list`: Lists duplicate entries with count and 'created_at' timestamp.
- `main`: Executes the main operation based on the specified action ('debug_cmd' or 'delete_cmd').

The script interacts with the Nightscout instance using cURL requests, allowing users to identify and delete duplicate treatments entries, primarily catering to Nightscout users managing data integrity.
*/


#!/usr/bin/env bash

source $(dirname $0)/oref0-bash-common-functions.sh || (echo "ERROR: Failed to run oref0-bash-common-functions.sh. Is oref0 correctly installed?"; exit 1)

usage "$@" <<EOF
Usage: $self --find <NIGHTSCOUT_HOST> - No-op version, find out what delete would do.
$self --list <NIGHTSCOUT_HOST> - list duplicate count per created_at
$self delete <NIGHTSCOUT_HOST> - Delete duplicate entries from ${NIGHTSCOUT_HOST-<NIGHTSCOUT_HOST>}
EOF

function fetch ( ) {
  curl --compressed -s -g $ENDPOINT.json
}

function flatten ( ) {
  jq -r '.created_at' | uniq -c
}


function find_dupes_on ( ) {
  count=$1
  date=$2
  test $count -gt 1  && curl --compressed -g -s ${ENDPOINT}.json"?count=$(($count-1))&find[created_at]=$date"
}
function debug_cmd ( ) {
tid=$1
echo -n  curl -X DELETE -H "API-SECRET: $API_SECRET" ${ENDPOINT}/${tid}
}

function delete_cmd ( ) {
tid=$1
(set -x
curl -X DELETE -H "API-SECRET: $API_SECRET" ${ENDPOINT}/$tid 
)
}

function list ( ) {
NIGHTSCOUT_HOST=$1
  test -z "$NIGHTSCOUT_HOST" && echo NIGHTSCOUT_HOST undefined. && print_usage && exit 1
ENDPOINT=${NIGHTSCOUT_HOST}/api/v1/treatments

export NIGHTSCOUT_HOST ENDPOINT
fetch | flatten | while read count date; do
  test $count -gt 1 && echo "{}" \
    | jq '[ .[]
      | .count = '$count'
      | .date = '$date'
      | .created_at = '$date' ]'
done | jq '.[]' | jq -s
}

function main ( ) {
NIGHTSCOUT_HOST=$1
ACTION=${2-debug_cmd}
ENDPOINT=${NIGHTSCOUT_HOST}/api/v1/treatments

if [[ -z "$NIGHTSCOUT_HOST" || -z "$NIGHTSCOUT_HOST" ]] ; then
  test -z "$NIGHTSCOUT_HOST" && echo NIGHTSCOUT_HOST undefined.
  test -z "$API_SECRET" && echo API_SECRET undefined.
  print_usage
  exit 1;
fi

export NIGHTSCOUT_HOST ENDPOINT
fetch | flatten | while read count date; do
  find_dupes_on $count $date | jq -r '.[] | ._id' | tac \
  | head -n 30 | while read tid line ; do
    echo -n $count' '
    $ACTION $tid
    echo
  done
done


}

export API_SECRET
test -n "$3" && API_SECRET=$3
case "$1" in
  --list)
    list $2
    ;;
  --find)
    main $2
    ;;
  delete)
    main $2 delete_cmd
    ;;
  *|help|--help|-h)
    print_usage
    exit 1;
    ;;
esac
# curl -s bewest.labs.diabetes.watch/api/v1/treatments.json | json -a created_at | uniq -c | while read count date; do test $count -gt 1  && curl -g -s bewest.labs.diabetes.watch/api/v1/treatments.json"?count=$(($count-1))&find[created_at]=$date" |   json -a _id | head -n 30 | while read tid line ; do  echo $count; (set -x;  curl -X DELETE -H "API-SECRET: $API_SECRET" bewest.labs.diabetes.watch/api/v1/treatments/$tid) ; done ; done  

# curl -s bewest.labs.diabetes.watch/api/v1/treatments.json | json -a created_at | uniq -c | while read count date; do test $count -gt 1  && curl -g -s bewest.labs.diabetes.watch/api/v1/treatments.json"?count=$(($count-1))&find[created_at]=$date" |   json -a _id | head -n 30 | while read tid line ; do  echo $count curl -X DELETE -H "API-SECRET: $API_SECRET" bewest.labs.diabetes.watch/api/v1/treatments/$tid ; done ; done  | cut -d ' ' -f 2-
