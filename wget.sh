#/bin/bash
# Latest Version 2010.07.22
# See ChangeLog 2008-09-12

flv_web_addr=$(echo "$1" | sed 's/^http:\/\([a-z0-9]\)/http:\/\/\1/')

wget -O /tmp/flv-search-result.txt "http://www.flvcd.com/parse.php?kw=$1&format=super"

# NAME=$(grep '<R>' /tmp/flv-search-result.txt | sed 's/^.*\<R\>//g')

grep "<U>" /tmp/flv-search-result.txt | sed 's/<U>//g' | wget -c -i -

#./aria2c.sh

rm -f /tmp/flv-search-result.txt
