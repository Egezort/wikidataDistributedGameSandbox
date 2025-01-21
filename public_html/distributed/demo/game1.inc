<?PHP

error_reporting(E_ERROR|E_CORE_ERROR|E_ALL|E_COMPILE_ERROR);
ini_set('display_errors', 'On');

require_once ( '/data/project/wikidata-game/public_html/php/common.php' ) ;
require_once ( '/data/project/wikidata-game/public_html/php/ToolforgeCommon.php' ) ;

$tfc = new ToolforgeCommon() ;

function getUID ( $db , $user ) {
	global $tfc ;
	$uid = '' ;
	$sql = "SELECT * FROM users WHERE name='$user'" ;
	$result = $tfc->getSQL ( $db , $sql ) ;
	while($o = $result->fetch_object()) $uid = $o->id ;
	if ( $uid == '' ) {
		$sql = "INSERT IGNORE INTO users (name) VALUES ('$user')" ;
		$out['sql'][] = $sql ;
		$tfc->getSQL ( $db , $sql ) ;
		$uid = $db->insert_id ;
		$sql = "INSERT INTO scores (user) VALUES ($uid)" ;
		$out['sql'][] = $sql ;
		$tfc->getSQL ( $db , $sql ) ;
	}
	return $uid ;
}

function hasLink ( $db , $q , $target ) {
	global $tfc ;
	$title = 'Q' . preg_replace ( '/\D/' , '' , "$q" ) ;
	$target = strtoupper ( $target ) ;
	$ns = 0 ;
	if ( $target[0] == 'P' ) $ns = 120 ;
	$sql = "SELECT * FROM page,pagelinks,linktarget WHERE pl_target_id=lt_id AND page_title='$title' AND page_namespace=0 AND page_id=pl_from AND lt_namespace=$ns AND lt_title='$target' LIMIT 1" ;
	$result = $tfc->getSQL ( $db , $sql ) ;
	if($o = $result->fetch_object()) return true ;
	return false ;
}

function isRedirect ( $db , $q ) {
	global $tfc ;
	$title = 'Q' . preg_replace ( '/\D/' , '' , "$q" ) ;
	$sql = "SELECT * FROM page WHERE page_title='$title' AND page_namespace=0 AND page_is_redirect=1 LIMIT 1" ;
	$result = $tfc->getSQL ( $db , $sql ) ;
	if($o = $result->fetch_object()) return true ;
	return false ;
}

function isDeleted ( $db , $q ) {
	global $tfc ;
	$title = 'Q' . preg_replace ( '/\D/' , '' , "$q" ) ;
	$sql = "SELECT * FROM page WHERE page_title='$title' AND page_namespace=0 LIMIT 1" ;
	$result = $tfc->getSQL ( $db , $sql ) ;
	if($o = $result->fetch_object()) return false ;
	return true ;
}

function doShareSitelinks ( &$db , $q1 , $q2 ) {
	global $tfc ;
	$sql = "SELECT ips_site_id FROM wb_items_per_site WHERE ips_item_id IN ($q1,$q2) GROUP BY ips_site_id HAVING count(*)>1" ;
	$result = $tfc->getSQL ( $db , $sql ) ;
	if($o = $result->fetch_object()) return true ;
	return false ;
}

?>