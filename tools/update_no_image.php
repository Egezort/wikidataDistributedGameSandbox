#!/usr/bin/php
<?PHP

error_reporting(E_ERROR|E_CORE_ERROR|E_ALL|E_COMPILE_ERROR);
ini_set('display_errors', 'On');
ini_set('memory_limit','3500M');
set_time_limit ( 60 * 60 ) ; // Seconds
require_once ( '../public_html/php/common.php' ) ;

function insertItems ( $items ) {
	global $dbu ;
	while ( count ( $items ) > 0 ) {
		$i = array() ;
		while ( count($i) < 10000 and count($items) > 0 ) $i[] = array_pop($items) ;
		$sql = "INSERT IGNORE INTO no_image ( item ) VALUES (" . join ( '),(' , $i ) . ")" ;
		if(!$result = $dbu->query($sql)) die('There was an error running the query [' . $dbu->error . '] '.$sql);
	}
}

//$db = openDB ( 'wikidata' , 'wikidata' ) ;
$dbu = openToolDB ( 'merge_candidates' ) ;


$queries = array (
	'claim[31:5] and noclaim[18]' , // People without image
	'claim[105:7432] and noclaim[18]' , // Species without image
	'claim[131,625] and noclaim[18]' // Places without image; maybe P17 (country) as well?
) ;
print "Getting candidates...\n" ;
foreach ( $queries AS $q ) {
	print "$q\n" ;
	$j = json_decode ( file_get_contents ( "$wdq_internal_url?q=".urlencode($q) ) ) ;
	if ( !isset ( $j->items ) or count ( $j->items ) == 0 ) continue ; // Paranoia
	insertItems ( $j->items ) ;
}
/*
print "Getting existing potentials...\n" ;
$hadthat = array () ;
$sql = "SELECT item FROM no_image" ;
if(!$result = $dbu->query($sql)) die('1 There was an error running the query [' . $db->error . ']'.$sql);
while($o = $result->fetch_object()){
	$hadthat[$o->item] = true ;
}

print "Inserting new potentials...\n" ;
foreach ( $j->items AS $q ) {
	if ( isset($hadthat[$q]) ) continue ;
	$sql = "INSERT IGNORE INTO no_image (item,random) VALUES ($q,rand())" ;
	if(!$result = $dbu->query($sql)) {} //die('4There was an error running the query [' . $db->error . ']'.$sql."\n");
}
*/
$sql = "UPDATE no_image SET random=rand() WHERE random IS NULL" ;
if(!$result = $dbu->query($sql)) die('There was an error running the query [' . $db->error . '] '.$sql);


?>