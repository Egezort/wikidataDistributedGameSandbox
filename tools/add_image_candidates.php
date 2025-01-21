#!/usr/bin/php
<?PHP

// jsub -mem 2g -cwd ./add_image_candidates.php

error_reporting(E_ERROR|E_CORE_ERROR|E_ALL|E_COMPILE_ERROR);
ini_set('display_errors', 'On');
ini_set('memory_limit','3500M');
set_time_limit ( 60 * 60 ) ; // Seconds
require_once ( '../public_html/php/common.php' ) ;

function cleanup () {
	global $dbu , $min_dupes ;
	$sql = "SELECT image,count(*) AS cnt FROM image_candidates group by image having cnt>=$min_dupes" ;
	if(!$result = $dbu->query($sql)) die('4 There was an error running the query [' . $dbu->error . ']'.$sql);
	$sqlq = array() ;
	while($o = $result->fetch_object()){
		$sqlq[] = "('" . $dbu->real_escape_string($o->image) . "')" ;
	}
	if ( count($sqlq) == 0 ) return ;
	$sql = "INSERT IGNORE INTO bad_images (image) VALUES " . join(',',$sqlq) ;
	if(!$result = $dbu->query($sql)) die('5 There was an error running the query [' . $dbu->error . ']'.$sql);
	
	$sql = "DELETE FROM image_candidates WHERE EXISTS (SELECT * FROM bad_images WHERE image_candidates.image=bad_images.image)" ;
	if(!$result = $dbu->query($sql)) die('6 There was an error running the query [' . $dbu->error . ']'.$sql);

	$sql = "UPDATE no_image SET status='NOCANDIDATE' WHERE status IS NULL AND NOT EXISTS (SELECT * FROM image_candidates WHERE no_image.item=image_candidates.item)" ;
	if(!$result = $dbu->query($sql)) die('7 There was an error running the query [' . $dbu->error . ']'.$sql);
}

function isFilteredImage ( $i ) {
	global $icons ;
	if ( isset ( $icons[$i] ) ) return true ;
	if ( preg_match ( '/\.svg$/i' , $i ) ) return true ;
	if ( preg_match ( '/\.gif$/i' , $i ) ) return true ;
	if ( preg_match ( '/^Flag_of_/i' , $i ) ) return true ;
	if ( preg_match ( '/^Crystal_Clear_/i' , $i ) ) return true ;
	if ( preg_match ( '/^Nuvola_/i' , $i ) ) return true ;
	if ( preg_match ( '/^Kit_.+\.png/i' , $i ) ) return true ;
	if ( preg_match ( '/^600px_.+\.png/i' , $i ) ) return true ;
	return false ;
}

function loadIconList () {
	global $icons , $dbu ;
	$sql = "SELECT image FROM bad_images" ;
	if(!$result = $dbu->query($sql)) die('0 There was an error running the query [' . $dbu->error . ']'.$sql);
	while($o = $result->fetch_object()){
		$icons[$o->image] = true ;
	}
}

$batch_size = 500 ;
$iterations = 100 ;
$min_dupes = 6 ; // Declare images "bad" if they are candidates for >= $min_dupes items

$db = openDB ( 'wikidata' , 'wikidata' ) ;
$dbc = openDB ( 'commons' , 'wikimedia' ) ;
$dbu = openToolDB ( 'merge_candidates' ) ;

$icons = array() ;
loadIconList() ;

function addCandidates () {
	global $db , $dbu , $dbc , $batch_size ;

	$r = rand()/getrandmax() ;
	$sql = "SELECT item FROM no_image WHERE status='NOCANDIDATE' AND random>$r ORDER BY random LIMIT $batch_size" ;
	$items = array() ;
	if(!$result = $dbu->query($sql)) die('1 There was an error running the query [' . $dbu->error . ']'.$sql);
	while($o = $result->fetch_object()){
		$items[] = $o->item ;
	}

	$sql = "select ips_item_id,ips_site_id,ips_site_page from wb_items_per_site WHERE ips_item_id IN (" . join(',',$items) . ")" ;
	if(!$result = $db->query($sql)) die('1 There was an error running the query [' . $db->error . ']'.$sql);
	$pages = array() ;
	$sqlq = array() ;
	while($o = $result->fetch_object()){
		if ( $o->ips_site_id == 'commonswiki' ) continue ;
		$p = str_replace(' ','_',$o->ips_site_page) ;
		$k = $o->ips_site_id . ':' . $p ;
		$pages[$k] = $o->ips_item_id ;
		$sqlq[] = "gil_wiki='" . $o->ips_site_id . "' AND gil_page_title='" . $db->real_escape_string($p) . "'" ;
	}

	$sql = "SELECT * FROM globalimagelinks WHERE gil_page_namespace_id=0 AND ((" . implode(') OR (',$sqlq) . "))" ;
	if(!$result = $dbc->query($sql)) die('1 There was an error running the query [' . $dbc->error . ']'.$sql);
	while($o = $result->fetch_object()){
		if ( isFilteredImage ( $o->gil_to ) ) continue ;
		$k = $o->gil_wiki . ':' . $o->gil_page_title ;
		if ( !isset ( $pages[$k] ) ) {
			print "Could not find $k\n" ;
			continue ;
		}
		$sql = "INSERT IGNORE INTO image_candidates (item,image) VALUES (" . $pages[$k] . ",'" . $db->real_escape_string($o->gil_to) . "')" ;
		if(!$result2 = $dbu->query($sql)) die('2 There was an error running the query [' . $dbc->error . ']'.$sql);
		$sql = "UPDATE no_image SET status=null WHERE item=" . $pages[$k] ;
		if(!$result2 = $dbu->query($sql)) die('3 There was an error running the query [' . $dbc->error . ']'.$sql);
	}
}

function add_instance_of () {
	global $dbu , $wdq_internal_url ;
	$entries = array() ;
	$sql = "SELECT * FROM no_image WHERE instance_of IS NULL AND status IS NULL LIMIT 500" ;
	if(!$result = $dbu->query($sql)) die('1 There was an error running the query [' . $dbu->error . ']'.$sql);
	while($o = $result->fetch_object()){
		$entries[$o->item] = $o->item ;
	}
	if ( count($entries) == 0 ) return 0 ;
	
	$query = "items[" . implode(',',array_keys($entries)) . "]" ;
	$url = "$wdq_internal_url?q=" . urlencode($query) . "&props=31" ;
	$j = json_decode ( file_get_contents ( $url ) ) ;
	if ( $j == null ) return 0 ;
	
	$p31 = '31' ;
	foreach ( $j->props->$p31 AS $v ) {
		if ( $v[1] != 'item' ) continue ;
		if ( !isset($entries[$v[0]]) ) continue ;
		$sql = "UPDATE no_image SET instance_of=" . $v[2] . " WHERE item=" . $entries[$v[0]] ;
		$dbu->query($sql) ;
		unset($entries[$v[0]]) ;
	}
	
	foreach ( $entries AS $q ) {
		$sql = "UPDATE no_image SET instance_of=0 WHERE item=$q" ;
		$dbu->query($sql) ;
	}
	
	return 1 ;
}

for ( $i = 0 ; $i < $iterations ; $i++ ) addCandidates() ;

while(add_instance_of()) ;

// Cleanup
cleanup() ;
	
?>