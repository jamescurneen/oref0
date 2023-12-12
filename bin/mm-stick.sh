
/*
This Bash script, a part of oref0, provides various operations to interact with a Medtronic USB stick using decocare utilities.

It supports several operations including:
- `scan`: Prints the local location of a plugged-in Medtronic stick.
- `diagnose`: Runs diagnostic checks on the connected Medtronic stick using `python -m decocare.stick`.
- `warmup`: Performs scan and diagnose with no output. Exits 0 on success or a non-zero exit code otherwise.
- `insert` / `remove`: Inserts or removes the `usbserial` kernel module for the Medtronic stick.
- `udev-info`: Prints udev information about the Medtronic stick.
- `list-usb`: Lists USB information about the connected Medtronic stick.
- `reset-usb`: Resets the entire USB stack, potentially risky action. Requires root permissions.
- `fail`: Always returns a failing exit code.

The script takes command-line arguments to execute these operations, allowing users to interact with the connected Medtronic stick, perform diagnostics, or manage USB-related configurations.

It is used for troubleshooting, USB module management, and accessing information related to the Medtronic USB stick, catering specifically to Medtronic device users interacting with the oref0 system.
*/

#!/usr/bin/env bash -eu

# Author: Ben West @bewest

# Written for decocare v0.0.17.

source $(dirname $0)/oref0-bash-common-functions.sh || (echo "ERROR: Failed to run oref0-bash-common-functions.sh. Is oref0 correctly installed?"; exit 1)


usage "$@" <<EOF
Usage: $self [{scan,diagnose,help},...]

    scan      - Print the local location of a plugged in stick.
    diagnose  - Run python -m decocare.stick \$(python -m decocare.scan)
    warmup    - Runs scan and diagnose with no output.
                Exits 0 on success, non-zero exit code
                otherwise.
    insert    - Insert usbserial kernel module.
    remove    - Remove usbserial kernel module.
    udev-info - Print udev information about the stick.
    list-usb  - List usb information about the stick.
    reset-usb - Reset entire usb stack. WARNING, be careful.
    fail      - Always return a failing exit code.
    help      - This message.
EOF

OUTPUT=/dev/fd/1
if [[ "${1-}" == "-f" ]] ; then
    shift
    OUTPUT=$1
    shift
fi
OPERATION=${1-help}
export OPERATION

function print_fail ( ) {
  cat <<EOF
$0 FAIL
$*
EOF
}


while [ -n "$OPERATION" ] ; do
(
case $OPERATION in
  scan)
    eval python -m decocare.scan
    ;;
  diagnose)
    eval python -m decocare.stick $(python -m decocare.scan)
    ;;
  warmup)
    eval python -m decocare.stick $(python -m decocare.scan) > /dev/null
    ;;
  remove)
    eval modprobe -r usbserial
    ;;
  insert)
    #Bus 002 Device 011: ID 0a21:8001 Medtronic Physio Control Corp. 
    eval modprobe --first-time usbserial vendor=0x0a21 product=0x8001
    ;;
  udev-info)
    eval udevadm info --query=all $(python -m decocare.scan)
    ;;
  reset-usb)
    if [[ $EUID != 0 ]] ; then
      echo This must be run as root!
      exit 1
    fi

    for xhci in /sys/bus/pci/drivers/?hci_hcd ; do

      if ! cd $xhci ; then
        echo Weird error. Failed to change directory to $xhci
        exit 1
      fi

      echo Resetting devices from $xhci...

      for i in ????:??:??.? ; do
        echo -n "$i" > unbind
        echo -n "$i" > bind
      done
    done
    ;;
  list-usb)
    if [[ $EUID != 0 ]] ; then
      echo This must be run as root!
      exit 1
    fi

    for xhci in /sys/bus/pci/drivers/?hci_hcd ; do

      if ! cd $xhci ; then
        echo Weird error. Failed to change directory to $xhci
        exit 1
      fi

      echo Resetting devices from $xhci...

      for i in ????:??:??.? ; do
        pwd
        echo $i
        ls $i
      done
    done
    ;;
  fail)
    print_fail $*
    exit 1
    ;;
  esac
)
shift
OPERATION=${1-}
done > $OUTPUT
exit $?
