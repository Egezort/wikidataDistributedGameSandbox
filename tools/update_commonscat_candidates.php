#!/usr/bin/php
<?PHP

error_reporting(E_ERROR|E_CORE_ERROR|E_ALL|E_COMPILE_ERROR);
ini_set('display_errors', 'On');
ini_set('memory_limit','3500M');
set_time_limit ( 60 * 60 ) ; // Seconds
require_once ( '../public_html/php/common.php' ) ;
/*
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
*/

$db = openDB ( 'wikidata' , 'wikidata' ) ;
$dbu = openToolDB ( 'merge_candidates' ) ;

print "Getting existing potentials...\n" ;
$done = array() ;
$sql = "select distinct epp_entity_id from wb_entity_per_page,pagelinks,linktarget where pl_target_id=lt_id AND epp_entity_type='item' and pl_from=epp_page_id and lt_namespace=120 and lt_title='P373'" ;
if(!$result = $db->query($sql)) die('1 There was an error running the query [' . $db->error . ']'.$sql);
while($o = $result->fetch_object()){
	$done[] = $o->epp_entity_id ;
}
$sql = "UPDATE potential_commonscat SET status='DEL' WHERE status is null and item IN (" . implode(',',$done) . ")" ;
unset($done);
$dbu->query($sql) ;

/*
$hadthat = array () ;
$sql = "SELECT item FROM potential_nationality" ;
if(!$result = $dbu->query($sql)) die('1 There was an error running the query [' . $db->error . ']'.$sql);
while($o = $result->fetch_object()){
	$hadthat[$o->item] = true ;
}
*/

print "Getting new potential items ...\n" ;
$require_space = 0 ;
$min_term_length = 5 ;
$sql = "select distinct term_text,epp_entity_id from commonswiki_p.page,wb_terms,wb_entity_per_page where epp_entity_id=term_entity_id AND page_namespace=14 and term_text=replace(page_title,'_',' ') and term_type='label' and term_entity_type='item' and length(term_text)>$min_term_length and not exists (select * from pagelinks,linktarget where pl_target_id=lt_id AND pl_from=epp_page_id and lt_namespace=120 and lt_title='P373' limit 1)" ;
if(!$result = $db->query($sql)) die('1 There was an error running the query [' . $db->error . ']'.$sql);
while($o = $result->fetch_object()){
	if ( $require_space and !preg_match('/\s/',$o->term_text ) ) continue ;
	$sql = "INSERT IGNORE INTO potential_commonscat (item,commonscat,random) VALUES (". $o->epp_entity_id . ",'" . get_db_safe($o->term_text) . "',rand())" ;
//	print "$sql\n" ;
	$dbu->query($sql) ;
}
/*
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
*/

/*
$dbu = openToolDB ( 'merge_candidates' ) ;
foreach ( $todo AS $item => $country ) {
	$sql = "INSERT IGNORE INTO potential_nationality (item,nationality) VALUES ($item,$country)" ;
	if(!$result = $dbu->query($sql)) print ('4 There was an error running the query [' . $dbu->error . ']'.$sql."\n");
}
*/

//$sql = "UPDATE potential_nationality SET random=rand() WHERE random IS NULL" ;
//if(!$result = $dbu->query($sql)) die('There was an error running the query [' . $db->error . '] '.$sql);

?>
