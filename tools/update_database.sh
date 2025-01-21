#!/bin/bash
cd /data/project/wikidata-game/tools
echo "Last run" > run.txt
echo "==GENDERLESS PEOPLE" >> run.txt
./update_genderless_people.php >> run.txt
echo "==MERGE 1" >> run.txt
echo "select term_text,group_concat(distinct term_entity_id separator '|') AS items,count(distinct term_entity_id) AS cnt from wb_terms where term_entity_type='item' and term_type in ('label','alias')  group by term_text having cnt>1" | /usr/bin/sql wikidatawiki_p | gzip -c > duplicate_labels.gz
echo "==MERGE 2" >> run.txt
zcat duplicate_labels.gz | ./update_merge_candidates.php >> run.txt
echo "==PEOPLE CANDIDATES" >> run.txt
./update_people_candidates.php >> run.txt
echo "==DISAMBIG" >> run.txt
./update_disambiguation_candidates.php >> run.txt
echo "==NATIONALITY" >> run.txt
./update_nationality_candidates.php >> run.txt
echo "==NO B/D DATE" >> run.txt
./update_people_no_date.php >> run.txt
echo "==NO IMAGE" >> run.txt
./update_no_image.php >> run.txt
echo "==NO ITEM" >> run.txt
./update_new_pages.php >> run.txt

echo "==DONE!" >> run.txt
