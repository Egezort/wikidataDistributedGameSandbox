#!/usr/bin/php
<?PHP

error_reporting(E_ERROR|E_CORE_ERROR|E_ALL|E_COMPILE_ERROR);
ini_set('display_errors', 'On');
ini_set('memory_limit','3500M');
set_time_limit ( 60 * 60 ) ; // Seconds
require_once ( '../public_html/php/common.php' ) ;

$country_cache = array() ;

function getCountry ( $q ) { // numeric only
	global $wdq_internal_url , $country_cache ;
	if ( isset ( $country_cache[$q] ) ) return $country_cache[$q] ;
	$url = "$wdq_internal_url?q=" . urlencode ( 'tree['.$q.'][17,131][] and claim[31:6256]' ) ; // P17 : country; P131 : is in ; 31:6256=instance of:country
	$j = json_decode ( file_get_contents ( $url ) ) ;
	
	$ret = '' ;
	if ( isset ( $j->items ) ) {
		if ( count ( $j->items ) != 1 ) $ret = '' ; // Not one country?!?
		else $ret = $j->items[0] ;
	}
	$country_cache[$q] = $ret ;
	return $ret ;
}


$db = openDB ( 'wikidata' , 'wikidata' ) ;
$dbu = openToolDB ( 'merge_candidates' ) ;

print "Getting existing potentials...\n" ;
$hadthat = array () ;
$sql = "SELECT item FROM potential_nationality" ;
if(!$result = $dbu->query($sql)) die('1 There was an error running the query [' . $db->error . ']'.$sql);
while($o = $result->fetch_object()){
	$hadthat[$o->item] = true ;
}

print "Getting new potential items ...\n" ;
$url = "$wdq_internal_url?props=19&q=" . urlencode ( 'claim[19] and noclaim[27] and between[569,1750,2020]' ) ; // Birth place, no nationality, born in/after 1750
//print "$url\n" ;
$j = json_decode ( file_get_contents ( $url ) ) ;
$todo = array() ;
foreach ( $j->props->{'19'} AS $x ) {
	if ( isset ( $hadthat[$x[0]] ) ) continue ;
	$hadthat[$x[0]] = true ;
	$country = getCountry ( $x[2] ) ;
	if ( $country == '' ) continue ;
	$todo[$x[0]] = $country ;
}


$dbu = openToolDB ( 'merge_candidates' ) ;
foreach ( $todo AS $item => $country ) {
	$sql = "INSERT IGNORE INTO potential_nationality (item,nationality) VALUES ($item,$country)" ;
	if(!$result = $dbu->query($sql)) print ('4 There was an error running the query [' . $dbu->error . ']'.$sql."\n");
}

$sql = "UPDATE potential_nationality SET random=rand() WHERE random IS NULL" ;
if(!$result = $dbu->query($sql)) die('There was an error running the query [' . $db->error . '] '.$sql);

?>
