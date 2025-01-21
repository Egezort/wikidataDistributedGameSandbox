#!/usr/bin/php
<?PHP

error_reporting(E_ERROR|E_CORE_ERROR|E_ALL|E_COMPILE_ERROR);
ini_set('display_errors', 'On');
require_once ( '../public_html/php/common.php' ) ;
require_once ( '../public_html/php/wikidata.php' ) ;

$num_items = 5000 ; // Items to try


function scanItem ( $i ) {
	global $dbu ;
	
	$qn = preg_replace ( '/\D/' , '' , $i->getQ() ) ;

	// Remove existing
	$sql = "DELETE FROM bold_aliases WHERE item=$qn AND status IS NULL" ;
	if(!$result = $dbu->query($sql)) die('There was an error running the query [' . $db->error . ']'."\n$sql");
	
	$sl = $i->getSitelinks() ;
	foreach ( $sl AS $wiki => $title ) {
		if ( preg_match ( '/:/' , $title ) ) continue ; // NS0 only
		$server = getWebserverForWiki ( $wiki ) ;
		if ( !preg_match ( '/^(.+)\.wikipedia\.org$/' , $server , $m ) ) continue ;
		$lang = $m[1] ;
		$url = "https://$server/wiki/" . myurlencode($title) ;
		$h = file_get_contents ( $url ) ;
		$h = preg_replace ( '/\s+/m' , ' ' , $h ) ;
		$h = preg_replace ( '/^.*?<p/' , '' , $h ) ; // Remove everything before first paragraph
		$h = preg_replace ( '/<\/p>.*$/' , '' , $h ) ; // Remove everything after last paragraph
		if ( !preg_match_all ( '/<b>\s*(.+?)\s*<\/b>/' , $h , $m ) ) continue ;
		
		$candidates = array() ;
		$existing = array() ;
		if ( isset($i->j->labels) and isset($i->j->labels->$lang) ) {
			$existing[strtolower($i->j->labels->$lang->value)] = $i->j->labels->$lang->value ;
		}
		if ( isset($i->j->aliases) and isset($i->j->aliases->$lang) ) {
			foreach ( $i->j->aliases->$lang AS $v ) {
				$existing[strtolower($v->value)] = $v->value ;
			}
		}
		
		foreach ( $m[1] AS $alias ) {
			if ( preg_match ( '/</' , $alias ) ) continue ; // HTML
			if ( isset($existing[strtolower($alias)]) ) continue ;
			$candidates[strtolower($alias)] = $alias ;
		}
		if ( count ( $candidates ) == 0 ) continue ;
		
		foreach ( $candidates AS $c ) {
			$sql = "INSERT IGNORE INTO bold_aliases (item,lang,aliases,random) VALUES ($qn,'".$dbu->real_escape_string($lang)."','".$dbu->real_escape_string($c)."',rand())" ;
			if(!$result = $dbu->query($sql)) die('There was an error running the query [' . $db->error . ']'."\n$sql");
		}
	}
}


$dbu = openToolDB ( 'merge_candidates' ) ;
$dbu->set_charset ( 'utf8' ) ;

// Load random items
$qs = array() ;
while ( $num_items > 0 ) {
	$num = $num_items > 500 ? 500 : $num_items ;
	$url = "https://www.wikidata.org/w/api.php?action=query&list=random&rnnamespace=0&rnlimit=$num&format=json" ;
	$j = json_decode ( file_get_contents ( $url ) ) ;
	foreach ( $j->query->random AS $k => $v ) {
		$q = $v->title ;
		if ( isset($qs[$q]) ) continue ;
		$qs[$q] = $q ;
		$num_items-- ;
	}
}

//$qs = array ( 'Q2476486' ) ; // Testing

$wil = new WikidataItemList ;
$wil->loadItems ( $qs ) ;
foreach ( $qs AS $q ) {
	if ( !$wil->hasItem($q) ) continue ;
	scanItem ( $wil->getItem($q) ) ;
}

?>