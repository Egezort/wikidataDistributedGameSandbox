#!/bin/bash
curl -s 'https://query.wikidata.org/sparql?query=SELECT%20%3Fq%20%7B%0A%20%20%3Fq%20wdt%3AP31%20wd%3AQ5%3B%20wdt%3AP106%20wd%3AQ1650915%0A%7D' | grep '<uri>' | sed 's|^.*/Q||' | sed 's|<.*$||' > researchers.qs
mariadb --defaults-file=$HOME/replica.my.cnf -h tools.db.svc.wikimedia.cloud --local-infile s51999__author_duplicates_p -e "LOAD DATA LOCAL INFILE 'researchers.qs' IGNORE INTO TABLE researchers (q)"
