/*
  This Bash script is a part of oref0 and is designed to assist in configuring Wi-Fi settings and installing the current release or a specified branch of oref0.

  Functionality:
  - Sets the BRANCH variable to 'master' by default for installing the current release of oref0, but allows the user to enter a specific branch for installation.
  - Disables kernel messages using 'dmesg -D'.
  - Scans for available Wi-Fi networks using 'ifup wlan0' and 'wpa_cli scan', displaying the strongest networks found.
  - Backs up and removes current Wi-Fi configurations, then prompts the user to input the network name and password for the new Wi-Fi connection.
  - Modifies '/etc/network/interfaces' and '/etc/wpa_supplicant/wpa_supplicant.conf' files based on user input for network settings.
  - Attempts to bring up the wlan0 interface with the new configuration.
  - Fetches and runs the 'openaps-install.sh' script from the openaps GitHub repository to install the specified branch of oref0.
*/


#!/usr/bin/env bash
(
BRANCH=master
dmesg -D
echo Scanning for wifi networks:
ifup wlan0
wpa_cli scan
echo -e "\nStrongest networks found:"
wpa_cli scan_res | sort -grk 3 | head | awk -F '\t' '{print $NF}' | uniq
set -e
echo -e /"\nWARNING: this script will back up and remove all of your current wifi configs."
read -p "Press Ctrl-C to cancel, or press Enter to continue:" -r
echo -e "\nNOTE: Spaces in your network name or password are ok. Do not add quotes."
read -p "Enter your network name: " -r
SSID=$REPLY
read -p "Enter your network password: " -r
PSK=$REPLY
cd /etc/network
cp interfaces interfaces.$(date +%s).bak
echo -e "auto lo\niface lo inet loopback\n\nauto usb0\niface usb0 inet static\n  address 10.11.12.13\n  netmask 255.255.255.0\n\nauto wlan0\niface wlan0 inet dhcp\n  wpa-conf /etc/wpa_supplicant/wpa_supplicant.conf" > interfaces
echo -e "\n/etc/network/interfaces:\n"
cat interfaces
cd /etc/wpa_supplicant/
cp wpa_supplicant.conf wpa_supplicant.conf.$(date +%s).bak
echo -e "ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev\nnetwork={\n  ssid=\"$SSID\"\n  psk=\"$PSK\"\n}" > wpa_supplicant.conf
echo -e "\n/etc/wpa_supplicant/wpa_supplicant.conf:\n"
cat wpa_supplicant.conf
echo -e "\nAttempting to bring up wlan0:\n"
ifdown wlan0; ifup wlan0
sleep 10
echo -ne "\nWifi SSID: "; iwgetid -r
sleep 5
echo "Press Enter to continue installing the current release (master) of oref0,"
read -p "or enter the oref0 branch name to install." -r
BRANCH=${REPLY:-master}
curl https://raw.githubusercontent.com/openaps/oref0/$BRANCH/bin/openaps-install.sh > /tmp/openaps-install.sh
bash /tmp/openaps-install.sh $BRANCH
)
