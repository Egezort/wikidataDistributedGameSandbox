#!/usr/bin/php
<?PHP

error_reporting(E_ERROR|E_CORE_ERROR|E_ALL|E_COMPILE_ERROR);
ini_set('display_errors', 'On');
require_once ( '../public_html/php/common.php' ) ;

$min_label_length = 4 ;
$max_num_dupes = 4 ;

$dbu = openToolDB ( 'merge_candidates' ) ;


$existing = array() ;
$sql = "SELECT item FROM genderless_people" ;
if(!$result = $dbu->query($sql)) die('There was an error running the query [' . $db->error . ']');
while($o = $result->fetch_object()){
	$existing[$o->item] = 1 ;
}

print count($existing) . " items in DB\n" ;


$url = "$wdq_internal_url?q=CLAIM[31:5]%20AND%20NOCLAIM[21]" ;
$j = json_decode ( file_get_contents ( $url ) ) ;
if ( !isset($j->items) or count($j->items) == 0 ) exit ( 0 ) ; // Paranoia

print count($j->items) . " items from WDQ\n" ;
print $j->items[0] . "\n" ;

$create = array() ;
foreach ( $j->items AS $i ) {
	if ( isset ( $existing[$i] ) ) $existing[$i] = "OK" ;
	else $create[] = $i ;
}

$remove = array() ;
foreach ( $existing AS $i => $s ) {
	if ( $s != 'OK' ) $remove[] = $i ;
}

print "Creating " . count($create) . ", remove " . count($remove) . "\n" ;

//$dbu->beginTransaction();
if ( count($create) > 0 ) {
	$sql = "INSERT IGNORE INTO genderless_people (item) VALUES (" . implode("),(",$create) . ")" ;
	if(!$result = $dbu->query($sql)) die('There was an error running the query [' . $db->error . ']');
}
if ( count($remove) > 0 ) {
	$sql = "DELETE FROM genderless_people WHERE status IS NULL AND item IN (" . implode(",",$remove) . ")" ;
	if(!$result = $dbu->query($sql)) die('There was an error running the query [' . $db->error . ']');
}
//$dbu->commit();

$sql = "UPDATE genderless_people SET random=rand() WHERE random IS NULL" ;
if(!$result = $dbu->query($sql)) die('There was an error running the query [' . $db->error . '] '.$sql);

?>