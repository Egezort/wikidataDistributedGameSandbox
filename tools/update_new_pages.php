#!/usr/bin/php
<?PHP

error_reporting(E_ERROR|E_CORE_ERROR|E_ALL|E_COMPILE_ERROR);
ini_set('display_errors', 'On');
ini_set('memory_limit','3500M');
set_time_limit ( 60 * 60 ) ; // Seconds
require_once ( '../public_html/php/common.php' ) ;


$db = openDB ( 'wikidata' , 'wikidata' ) ;
$dbu = openToolDB ( 'merge_candidates' ) ;

$days = 5 ;
$sites = array () ;

foreach ( array('en','de','fr','es','it','nl','eo') AS $lang ) {
	$sites[$lang.'wiki'] = array ( $lang , 'wikipedia' ) ;
}


$since = ($days * 24*60*60);
$now = date('YmdHis',time()-$since) ;

foreach ( $sites AS $site => $con ) {

	// Get list of all pages not edited in at least $days
	$dbwp = openDB ( $con[0] , $con[1] ) ;
	$sql = "select page_title from page where page_namespace=0 AND page_touched<$now AND page_is_redirect=0" ;
	if ( $site == 'enwiki' ) $sql .= " AND NOT EXISTS (SELECT * from pagelinks,linktarget WHERE pl_target_id=lt_id AND pl_from=page_id AND lt_namespace=4 AND lt_title='Soft_redirect')" ;
	if ( $site == 'dewiki' ) $sql .= " AND NOT EXISTS (SELECT * from categorylinks WHERE cl_from=page_id AND cl_to='Wikipedia:Falschschreibung')" ;
//	$sql .= " LIMIT 50000" ; // TESTING
	if(!$result = $dbwp->query($sql)) die('1 There was an error running the query [' . $db->error . ']'.$sql);
	while($o = $result->fetch_object()){
	
		// Check for matching item in Wikidata
		$title = str_replace ( '_' , ' ' , $o->page_title ) ;
		$t = $dbwp->real_escape_string ( $title ) ;
		$sql = "SELECT count(*) AS cnt FROM wb_items_per_site WHERE ips_site_id='$site' AND ips_site_page='$t' LIMIT 1" ;
		if(!$r2 = $db->query($sql)) die('2 There was an error running the query [' . $db->error . ']'.$sql);
		$o2 = $r2->fetch_object() ;
		if ( $o2->cnt > 0 ) continue ;
		
		// Write to game DB
//		print "$site:$title\n" ;
		if ( !$dbu->ping() ) $dbu = openToolDB ( 'merge_candidates' ) ;
		$sql = "INSERT IGNORE INTO potential_new_pages (site,page) VALUES ('$site','$t')" ;
		if(!$r3 = $dbu->query($sql)) die('3 There was an error running the query [' . $dbu->error . ']'.$sql);
	}
	$dbwp->close () ;
}

$sql = "UPDATE potential_new_pages SET random=rand() WHERE random IS NULL" ;
if(!$result = $dbu->query($sql)) die('There was an error running the query [' . $db->error . '] '.$sql);

?>