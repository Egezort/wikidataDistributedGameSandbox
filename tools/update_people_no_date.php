#!/usr/bin/php
<?PHP

error_reporting(E_ERROR|E_CORE_ERROR|E_ALL|E_COMPILE_ERROR);
ini_set('display_errors', 'On');
ini_set('memory_limit','3500M');
set_time_limit ( 60 * 60 ) ; // Seconds
require_once ( '../public_html/php/common.php' ) ;


print "Getting all people...\n" ;
$j = json_decode ( file_get_contents ( "$wdq_internal_url?q=".urlencode('(claim[31:5] and noclaim[569]) or (claim[31:5] and between[569,0,1880] and noclaim[570])') ) ) ;
if ( !isset ( $j->items ) or count ( $j->items ) == 0 ) exit ( 0 ) ; // Paranoia

//$db = openDB ( 'wikidata' , 'wikidata' ) ;
$dbu = openToolDB ( 'merge_candidates' ) ;


print "Getting existing potentials...\n" ;
$hadthat = array () ;
$sql = "SELECT item FROM people_no_date" ;
if(!$result = $dbu->query($sql)) die('1 There was an error running the query [' . $db->error . ']'.$sql);
while($o = $result->fetch_object()){
	$hadthat[$o->item] = true ;
}

print "Inserting new potentials...\n" ;
foreach ( $j->items AS $q ) {
	if ( isset($hadthat[$q]) ) continue ;
	$sql = "INSERT IGNORE INTO people_no_date (item,random) VALUES ($q,rand())" ;
	if(!$result = $dbu->query($sql)) {} //die('4There was an error running the query [' . $db->error . ']'.$sql."\n");
}

$sql = "UPDATE people_no_date SET random=rand() WHERE random IS NULL" ;
if(!$result = $dbu->query($sql)) die('There was an error running the query [' . $db->error . '] '.$sql);


?>