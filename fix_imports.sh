#!/bin/bash
dirs=$(find ./contracts -type d -name '*' | grep -e './contracts/')

for dir in $dirs; do
  dirfiles=$(find $dir -maxdepth 1 -type f)
  for file in $dirfiles; do
    file_imports=($(cat $file | awk '$1 == "import" { print $2 }' | sed -re 's/.*\/(.*)";/\1/g'))
    for import in ${file_imports[@]}; do
      file_import_pattern=$(cat $file | grep "/$import" | sed -re 's/.*"(.*)";/\1/g')
      find_res=$(realpath --relative-to=$dir $(find contracts -name $import))
      replace_pattern=$(echo $find_res| sed -re 's/\./\\\./g' | sed -re 's/\//\\\//g')
      search_pattern=$(echo $file_import_pattern | sed -re 's/\./\\\./g' | sed -re 's/\//\\\//g')
      sed -i $file -re "s/$search_pattern/.\/$replace_pattern/g"
    done
  done
done
