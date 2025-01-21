#!/usr/bin/php
<?PHP

error_reporting(E_ERROR|E_CORE_ERROR|E_ALL|E_COMPILE_ERROR);
ini_set('display_errors', 'On');
require_once ( '../public_html/php/common.php' ) ;

$batch_size = 1000 ;

$unlikely_page_title = "vwhj9ew8h94whbviwg7vi7w" ;
$db = openDB ( 'wikidata' , 'wikidata' ) ;
$dbu = openToolDB ( 'merge_candidates' ) ;

$hadthat = array() ;
if ( 0 ) { // Pre-filter existing items?
	$sql = "select distinct item from potential_author" ;
	if(!$result = $dbu->query($sql)) die('There was an error running the query 1[' . $db->error . '] '.$sql);
	while($o = $result->fetch_object()){
		$hadthat[$o->item] = 1 ;
	}
}

// Get authors
$url = "$wdq_internal_url?q=" . urlencode("claim[31:5] and claim[106:(tree[36180][][279])]") ;
$j = json_decode ( file_get_contents ( $url ) ) ;
$sql = "select * from wb_items_per_site WHERE ips_item_id IN (" . implode ( ',' , $j->items ) . ")" ;
if(!$result = $db->query($sql)) die('There was an error running the query 1[' . $db->error . '] '.$sql);
$authors = array() ;
$auth_rev = array() ;
while($o = $result->fetch_object()){
//	if ( $o->ips_item_id == '121594' ) continue ; // Professor
//	if ( $o->ips_item_id == '19546' ) continue ; // Pope
	$auth = str_replace ( ' ' , '_' , $o->ips_site_page ) ;
	$authors[$o->ips_site_id][] = $auth ;
	$auth_rev[$o->ips_site_id][$auth] = $o->ips_item_id ;
}

// Make SQL strings
$auth2 = array() ;
foreach ( $authors AS $site => $list ) {
	$a = array() ;
	foreach ( $list AS $l ) $a[] = $db->real_escape_string ( $l ) ;
//	print "$site\n" ; print_r ( $a ) ;
//	if ( count ( $a ) == 0 ) $a = array ( $unlikely_page_title ) ;
	$auth2[$site] = '"' . implode ( '","' , $a ) . '"' ;
}
$authors = $auth2 ;

print count ( $authors ) . " authors/sites found.\n" ;

// Get books without author
$url = "$wdq_internal_url?q=" . urlencode("claim[31:571] and noclaim[50]") ;
$j = json_decode ( file_get_contents ( $url ) ) ;
shuffle ( $j->items ) ;
$candidates = array_slice ( $j->items , 0 , $batch_size ) ; // subset
unset ( $j ) ; // Save space

$sql = "select * from wb_items_per_site WHERE ips_item_id IN (" . implode ( ',' , $candidates ) . ")" ;
if(!$result = $db->query($sql)) die('There was an error running the query 2[' . $db->error . '] '.$sql);
$people = array() ;
while($o = $result->fetch_object()){
	if ( isset ( $hadthat[$o->ips_item_id] ) ) continue ; // Have those already
	if ( preg_match ( '/:/' , $o->ips_site_page ) ) continue ; // No namespace-prexied titles
	$people[$o->ips_site_id][$o->ips_item_id] = $db->real_escape_string ( str_replace ( ' ' , '_' , $o->ips_site_page ) ) ;
}

print count ( $people ) . " people/sites found.\n" ;

$person2auth = array() ;
foreach ( $people AS $site => $list ) {
	if ( !preg_match ( '/wiki$/' , $site ) ) continue ; // Wikipedia only
	if ( !isset ( $authors[$site] ) ) continue ;
	$auths = $authors[$site] ;
	$dbw = openDBwiki ( $site ) ;
	if ( $dbw === false ) continue ; // Can't open database
	foreach ( $list AS $q => $title ) {
		$sql = "SELECT * FROM page,pagelinks,linktarget WHERE pl_target_id=lt_id AND page_title=\"$title\" and page_namespace=0 and page_id=pl_from and lt_namespace=0 and lt_title IN ($auths)" ;
		if(!$result = $dbw->query($sql)) die('There was an error running the query 3[' . $db->error . '] '."$site : $sql");
		while($o = $result->fetch_object()){
			if ( !isset ( $auth_rev[$site][$o->lt_title] ) ) { print "Dunno $site:".$o->lt_title."\n"; continue ; }
			$person2auth[$q][$auth_rev[$site][$o->lt_title]] = 1 ;
		}
	}
}

$dbu = openToolDB ( 'merge_candidates' ) ;

foreach ( $person2auth AS $q_item => $list ) {
	$q_target = implode ( ',' , array_keys ( $list ) ) ;
	$sql = "INSERT IGNORE INTO potential_author (item,author) VALUES ($q_item,'$q_target')" ;
	if(!$result = $dbu->query($sql)) die('There was an error running the query 4[' . $db->error . '] '."$site : $sql");
}

$sql = "update potential_author set random=rand() where random is null" ;
if(!$result = $dbu->query($sql)) die('There was an error running the query 5[' . $db->error . '] '.$sql);

?>