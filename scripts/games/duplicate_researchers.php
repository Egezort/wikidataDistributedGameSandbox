#!/usr/bin/php
<?PHP

error_reporting(E_ERROR|E_CORE_ERROR|E_ALL|E_COMPILE_ERROR);
ini_set('display_errors', 'On');

require_once ( '/data/project/wikidata-game/scripts/games/WikidataGameHelper.php' ) ;

#$action = $argv[1]??'all' ;

function run_single_author($q_numeric) {
	global $wgh, $db;
	// print "Q{$q_numeric}\n";
	$sparql = "SELECT (group_concat(DISTINCT ?qLabel;separator='|') AS ?labels) (group_concat(DISTINCT REPLACE(str(?q),'^.+/','');separator='|') AS ?qs) ?lastName ?firstLetter (count(DISTINCT ?q) AS ?cnt) {
		  VALUES ?author { wd:Q{$q_numeric} }.
		  ?paper wdt:P50 ?author.
		  ?paper wdt:P50 ?q.
		  ?q rdfs:label ?qLabel.
		  FILTER(lang(?qLabel)='en').
		  BIND(REPLACE(?qLabel, '^.* ', '') AS ?lastName).
  		  BIND(REPLACE(?qLabel, '^(.).*$', '$1') AS ?firstLetter)
		  }
		GROUP BY ?lastName ?firstLetter
		HAVING (?cnt>1)";
	$j = $wgh->tfc->getSPARQL($sparql);
	$values = [];
	foreach ( $j->results->bindings AS $b ) {
		if ( in_array($b->lastName->value, ['Jr.']) ) continue;
		$qs = explode('|',$b->qs->value);
		if ( count($qs)>3 ) continue; // Too many permutations
		for ($i=0;$i<sizeof($qs);$i++) {
			for ($j=$i+1;$j<sizeof($qs);$j++) {
				$qq = [preg_replace('|\D|','',$qs[$i]),preg_replace('|\D|','',$qs[$j])];
				sort($qq,SORT_NUMERIC);
				$values[] = "({$qq[0]},{$qq[1]},rand())";
			}
		}
	}
	if ( count($values)>0 ) {
		sort($values);
		$values = array_unique($values);
		$sql = "INSERT IGNORE INTO `author_pairs` (`q1`,`q2`,`random`) VALUES ".implode(',',$values) ;
		$wgh->tfc->getSQL($db,$sql);
	}

	$sql = "UPDATE `researchers` SET `checked`=1 WHERE `q`={$q_numeric}";
	$wgh->tfc->getSQL($db,$sql);
}


$wgh = new WikidataGameHelper ;
$db = $wgh->tfc->openDBtool('author_duplicates_p');

// run_single_author(13520818); exit(0);# TESTING

$batch_size=500;
while ( true ) {
	$sql = "SELECT * FROM researchers WHERE checked=0 LIMIT {$batch_size}" ;
	$cnt = 0 ;
	$result = $wgh->tfc->getSQL($db,$sql);
	while($o = $result->fetch_object()) {
		$cnt++;
		run_single_author($o->q);
	}
	if ( $cnt!=$batch_size ) break; // The end
}

$wgh->tfc->showProcInfo();

?>