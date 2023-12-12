/*
This Bash script, part of the oref0 system, performs a series of commands to create symbolic links for executable files specified within the oref0 package.

The script executes the following steps:
1. Gathers relevant executable file information from the package.json file using 'grep' and 'cut' commands.
2. Filters out specific file types (js, sh, py) and excludes certain file names (bt-pan, l, wifi) using 'grep' and 'sed'.
3. Processes each identified file by removing the './bin/' prefix using 'sed'.
4. Loops through the list of identified files and creates symbolic links for each file if a link with the same name doesn’t exist already.

The script checks for file suffixes and avoids creating symbolic links for files that already possess suffixes. Additionally, it ensures not to recreate existing links to maintain integrity within the oref0 system, enhancing file accessibility and execution across the system.
*/


#!/usr/bin/env bash

grep bin ../package.json |\
  grep : |\
  cut -d\" -f2,4 |\
  sed s/\"/\ / |\
  grep -v -E '(^(bt-pan|l||wifi)\s|^bin$)' |\
  grep -E '\.(js|sh|py)$' |\
  sed s#./bin/## |\
  while read -r link script ; do
    # Only if the link doesn't have the suffix
    if [ "${link}" == "${link%%.??}" ] ; then
      # Don't try to create existing links
      if [ ! -L "${link}" ] ; then
        ln -s "${script}" "${link}"
      fi
    fi
  done
