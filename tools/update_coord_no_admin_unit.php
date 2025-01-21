#!/usr/bin/php
<?PHP

error_reporting(E_ERROR|E_CORE_ERROR|E_ALL|E_COMPILE_ERROR);
ini_set('display_errors', 'On');
ini_set('memory_limit','3500M');
set_time_limit ( 60 * 60 ) ; // Seconds
require_once ( '../public_html/php/common.php' ) ;
require_once ( '../public_html/php/wikidata.php' ) ;

$batch_size = 500 ;
$max_candidates = 5 ;
$min_close_items = 5 ;
$query = "claim[625] and noclaim[131] and noclaim[31:6256] and noclaim[31:4022]" ;

$testing = false ;
$items = array() ;

if ( isset($argv[1]) ) {
	$testing = true ;
	$items = array ( preg_replace ( '/\D/' , '' , $argv[1] ) ) ;
} else {
	$j = json_decode ( file_get_contents ( "$wdq_internal_url?q=".urlencode($query) ) ) ;
	$items = $j->items ;
	unset ( $j ) ;
	shuffle ( $items ) ;
	$items = array_slice ( $items , 0 , $batch_size ) ;
}

$db = openToolDB ( 'merge_candidates' ) ;

// Remove the ones we already have
if ( !$testing ) {
	$sql = "SELECT * FROM coord_no_admin_unit WHERE q IN (" . implode(',',$items) . ")" ;
	if(!$result = $db->query($sql)) die('There was an error running the query [' . $db->error . ']');
	while($o = $result->fetch_object()){
		if ( ($k=array_search($o->q, $items)) !== false ) unset($items[$k]) ;
	}
}

$wdi = new WikidataItemList ;
$wdi->loadItems ( $items ) ;

$p131 = '131' ;
foreach ( $items AS $q ) {
	if ( !$wdi->hasItem ( $q ) ) continue ;
	$i = $wdi->getItem ( $q ) ;
	if ( !$i->hasClaims('P625') ) { print "Has no coords\n" ; continue ; }
	if ( $i->hasClaims('P131') ) { print "Has admin unit\n" ; continue ; }
	$c = $i->getClaims('P625') ;
	$c = $c[0] ;
	if ( !isset($c->mainsnak) ) continue ;
	if ( !isset($c->mainsnak->datavalue) ) continue ;
	if ( !isset($c->mainsnak->datavalue->value) ) continue ;
	$c = $c->mainsnak->datavalue->value ;
	
	$candidates = array() ;
	for ( $radius = 1 ; $radius < 55 ; $radius += 5 ) {
		$query = "around[625,{$c->latitude},{$c->longitude},$radius]" ;
		$url = "http://wdq.wmflabs.org/api?q=".urlencode($query)."&props=131" ;
		$t = file_get_contents ( $url ) ;
		if ( preg_match ( '/\{\[\]\}/' , $t ) ) continue ; // No admin regions
		$j = json_decode ( $t ) ;
		if ( count($j->items) < $min_close_items ) continue ;
		foreach ( $j->props->$p131 AS $v ) {
			if ( $v[2] == $q ) continue ;
			$candidates[$v[2]] = $v[2] ;
		}
		if ( $testing ) print "Close items within $radius km: " . count($j->props->$p131) . "\n" ;
		if ( count($candidates) == 0 ) continue ;
		break ;
	}
	
	if ( $testing )  print_r ( $candidates ) ;
	
	if ( count ( $candidates ) == 0 ) continue ;
	if ( count ( $candidates ) > $max_candidates ) continue ;
	
	$sql = "INSERT IGNORE INTO coord_no_admin_unit (q,lat,lon,candidates,random) VALUES ($q,{$c->latitude},{$c->longitude},'" . implode(',',$candidates) . "',rand())" ;
	
	if ( $testing ) {
		print "$sql\n" ;
		exit ( 0 ) ;
	}
	
	if ( !$db->ping() ) $db = openToolDB ( 'merge_candidates' ) ;
	if(!$result = $db->query($sql)) die('There was an error running the query [' . $db->error . ']');
}

//$sql = "UPDATE coord_no_admin_unit SET random=rand() WHERE random IS NULL" ;
//if(!$result = $dbu->query($sql)) die('There was an error running the query [' . $db->error . '] '.$sql);

?>