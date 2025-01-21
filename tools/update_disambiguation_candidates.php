#!/usr/bin/php
<?PHP

error_reporting(E_ERROR|E_CORE_ERROR|E_ALL|E_COMPILE_ERROR);
ini_set('display_errors', 'On');
ini_set('memory_limit','3500M');
set_time_limit ( 60 * 60 ) ; // Seconds
require_once ( '../public_html/php/common.php' ) ;

$db = openDB ( 'wikidata' , 'wikidata' ) ;
$dbu = openToolDB ( 'merge_candidates' ) ;

print "Getting existing potentials...\n" ;
$hadthat = array () ;
$sql = "SELECT item FROM potential_disambig" ;
if(!$result = $dbu->query($sql)) die('1 There was an error running the query [' . $db->error . ']'.$sql);
while($o = $result->fetch_object()){
	$hadthat[$o->item] = true ;
}


$items = array() ; // Candidates

function checkCandidates ( $site , $candidate_pages ) {
	global $db , $hadthat , $items ;
	print count ( $candidate_pages ) . " candidate pages, checking ... " ;
	$sql = "select ips_item_id FROM wb_items_per_site WHERE ips_site_id='$site' AND ips_site_page IN ('" . implode ( "','" , $candidate_pages ) . "') AND NOT EXISTS (SELECT * FROM pagelinks,wb_entity_per_page ,linktarget WHERE pl_target_id=lt_id AND ips_item_id=epp_entity_id and pl_from=epp_page_id and lt_namespace=120 and lt_title='P31')" ;
	if(!$result = $db->query($sql)) die('2 There was an error running the query [' . $db->error . ']'.$sql);
	$cnt = 0 ;
	while($o = $result->fetch_object()){
		if ( isset ( $hadthat[$o->ips_item_id] ) ) continue ;
		if ( isset ( $items[$o->ips_item_id] ) ) continue ;
		$items[$o->ips_item_id] = true ;
		$cnt++ ;
	}
	print "$cnt new items added.\n" ;
}

function getFromCat ( $lang , $cat ) {
	global $db ;
	$site = $lang . 'wiki' ;
	print "Getting $site candidates ... " ;
	$dbw = openDB ( $lang , 'wikipedia' ) ;
	$pages = getPagesInCategory ( $dbw , $cat , 0 , 0 , true ) ;
	$candidate_pages = array() ;
	foreach ( $pages AS $p ) {
		if ( preg_match ( '/^\d+[ _]/' , $p ) ) continue ; // No "XXXX in..."
		$p = $dbw->real_escape_string ( str_replace ( '_' , ' ' , $p ) ) ;
		$candidate_pages[] = $p ;
	}

	if ( count ( $candidate_pages ) == 0 ) return ;
	checkCandidates ( $site , $candidate_pages ) ;
}


getFromCat ( 'es' , 'Wikipedia:Desambiguación' ) ;
getFromCat ( 'it' , 'Disambigua' ) ;
getFromCat ( 'en' , 'All set index articles' ) ;
getFromCat ( 'en' , 'All disambiguation pages' ) ;
getFromCat ( 'de' , 'Begriffsklärung' ) ;
getFromCat ( 'sv' , 'Förgreningssidor' ) ;


print "Items with \"Wikipedia disambiguation page\" as description but no \"instance of\"...\n" ;
$sql = "select DISTINCT term_entity_id from wb_terms where term_entity_type='item' and term_type='description' and term_text='Wikipedia disambiguation page' and not exists (SELECT * FROM pagelinks,wb_entity_per_page,linktarget WHERE pl_target_id=lt_id AND term_entity_id=epp_entity_id and pl_from=epp_page_id and lt_namespace=120 and lt_title='P31')" ;
if(!$result = $db->query($sql)) die('3 There was an error running the query [' . $db->error . ']'.$sql);
while($o = $result->fetch_object()){
	if ( isset ( $hadthat[$o->term_entity_id] ) ) continue ;
	$items[$o->term_entity_id] = true ;
}


// sv.wikipedia
if ( 1 ) {
	print "Checking sv.wp ... " ;
	$dbsv = openDB ( 'sv' , 'wikipedia' ) ;
	$sql = 'select distinct page_title from page,templatelinks where page_id=tl_from and page_namespace=0 and tl_namespace=10 and tl_title in ("Efternamn","Fyrbokstavsförgrening","Förgrening","Förgrening_bas","Förnamn","Namnförgrening","Robotskapad_förgrening","Trebokstavsförgrening","Robotskapad förgrening")' ;
	if(!$result = $dbsv->query($sql)) die('2 There was an error running the query [' . $db->error . ']'.$sql);
	$svpages = array() ;
	while($o = $result->fetch_object()){
		$svpages[] = $dbsv->real_escape_string ( str_replace ( '_' , ' ' , $o->page_title ) ) ;
	}
	checkCandidates ( 'svwiki' , $svpages ) ;
}



$dbu = openToolDB ( 'merge_candidates' ) ;
print "Updating DB ( " . count ( $items ) . " items)...\n" ;

function insertItems ( $items ) {
	global $dbu ;
	while ( count ( $items ) > 0 ) {
		$i = array() ;
		while ( count($i) < 10000 and count($items) > 0 ) $i[] = array_pop($items) ;
		$sql = "INSERT IGNORE INTO potential_disambig ( item ) VALUES (" . join ( '),(' , $i ) . ")" ;
		if(!$result = $dbu->query($sql)) die('There was an error running the query [' . $dbu->error . '] '.$sql);
	}
}

$a = array_keys ( $items ) ;
insertItems ( $a ) ;
//$sql = "INSERT IGNORE INTO potential_disambig ( item ) VALUES (" . implode ( '),(' , $a ) . ")" ;
//if(!$result = $dbu->query($sql)) {} //die('4There was an error running the query [' . $db->error . ']'.$sql."\n");

$sql = "UPDATE potential_disambig SET random=rand() WHERE random IS NULL" ;
if(!$result = $dbu->query($sql)) die('There was an error running the query [' . $db->error . '] '.$sql);


?>