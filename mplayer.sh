#/bin/bash
# Latest Version 2010.07.22
# See ChangeLog 2008-09-12

if [ "$#" != 1 ]
then
	PLAYER='mplayer'
	QULITY='super'
	while getopts ":svdnh:" PAR
	do 
		case $PAR in
			s)
				QULITY='super'
				;;
			h)
				QULITY='high'
				;;
			n)
				QULITY='normal'
				;;
			v)
				PLAYER='cvlc'
				;;
			d)
				PLAYER='wget'
				;;
		esac
	done
	# echo $PAR $PLAYER $QULITY
	if [ "$#" = 2 ]
	then
		# echo $PAR $PLAYER $QULITY
		wget -O - "http://www.flvcd.com/parse.php?kw=$2&format=$QULITY" | grep "<U>" - | sed s/\<U\>//g |xargs $PLAYER
	else 
		# echo $PAR $PLAYER $QULITY
		wget -O - "http://www.flvcd.com/parse.php?kw=$3&format=$QULITY" | grep "<U>" - | sed s/\<U\>//g |xargs $PLAYER 
	fi
else 
	wget -O - "http://www.flvcd.com/parse.php?kw=$1&format=super" | grep "<U>" - | sed s/\<U\>//g |xargs mplayer -
fi
# grep "<U>" /tmp/flv-search-result.txt | sed s/\<U\>//g | mplayer -playlist -
# grep "<U>" /tmp/flv-search-result.txt | sed s/\<U\>//g | vlc -
# rm -f /tmp/flv-search-result.txt
