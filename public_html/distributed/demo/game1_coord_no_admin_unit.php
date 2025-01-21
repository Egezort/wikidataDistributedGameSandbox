<?PHP

require_once ( './game1.inc' ) ;
require_once ( '../../php/wikidata.php' ) ;

header('Content-type: application/json');

$callback = get_request ( 'callback' , '' ) ;
$action = get_request ( 'action' , '' ) ;

$out = array () ;
$wil = new WikidataItemList ;

if ( $action == 'desc' ) {

	$out = array (
		"label" => array ( "en" => "Administrative unit" ) ,
		"description" => array ( "en" => "Some items have coordinates but no administrative unit. Units will be suggested to you based on nearby items." ) ,
		"icon" => 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/World_Map_Icon_%3F.svg/120px-World_Map_Icon_%3F.svg.png'
	) ;

} else if ( $action == 'tiles' ) {
	$db = openToolDB ( 'merge_candidates' ) ;
	$dbwd = openDB ( 'wikidata' , 'wikidata' ) ;

	// GET parameters
	$num = get_request('num',1)*1 ; // Number of games to return
	$lang = get_request('lang','en') ; // The language to use, with 'en' as fallback; ignored in this game
	$hadthat = array() ;
	
	$out['tiles'] = array() ;
	while ( count($out['tiles']) < $num ) {
		$r = rand() / getrandmax() ;
		$tmp = array() ;
		$sqls = array() ;
		$use_labels = array() ;
		$sql = "SELECT * FROM coord_no_admin_unit WHERE done=0 AND random >= $r " ;
		if ( count ( $hadthat ) > 0 ) $sql .= " AND id NOT IN (" . implode(',',$hadthat) . ") " ;
		$sql .= " ORDER BY random LIMIT " . ($num*2) ;
		if(!$result = $db->query($sql)) die('There was an error running the query [' . $db->error . ']');
		while($o = $result->fetch_object()){
			// Sanity checks
			if ( isDeleted ( $dbwd , $o->q ) or isRedirect ( $dbwd , $o->q ) or hasLink ( $dbwd , $o->q , 'P131' ) ) {
				$sqls[] = "UPDATE coord_no_admin_unit SET done=1 WHERE id=" . $o->id ;
				continue ;
			}
			$o->candidates = explode ( ',' , $o->candidates ) ;
			$tmp[] = $o ;
			foreach ( $o->candidates AS $c ) $use_labels["Q$c"] = "Q$c" ;
		}
		foreach ( $sqls AS $sql ) $db->query($sql) ; // Clean-up
		if ( count($tmp) == 0 ) continue ;
		
		$wil->loadItems ( $use_labels ) ;

		foreach ( $tmp AS $o ) {
			$hadthat[] = $o->id ;
			$g = array(
				'id' => $o->id ,
				'sections' => array () ,
				'controls' => array ()
			) ;
		
			$q = 'Q'.$o->q ;
			
			$entries = array() ;
			foreach ( $o->candidates AS $c ) {
				$i = $wil->getItem($c) ;
				$label = "Q$c" ;
				if ( $label == $q ) continue ; // Not in self...
				if ( isset($i) ) $label = $i->getLabel($lang) ;
				$a = array ( 'type' => 'green' , 'decision' => 'yes' , 'label' => $label , 'api_action' => 
					array ('action'=>'wbcreateclaim','entity'=>"$q",'snaktype'=>'value','property'=>'P131',
						'value'=>'{"entity-type":"item","numeric-id":'.$c.'}'
					)
				) ;
				$entries[] = $a ;
			}
		
			$g['sections'][] = array ( 'type' => 'map' , 'lat' => $o->lat , 'lon' => $o->lon , 'zoom' => $o->zoom ) ;
			$g['sections'][] = array ( 'type' => 'item' , 'q' => $q ) ;
			$g['controls'][] = array ( 'type' => 'buttons' , 'entries' => $entries ) ;
			$g['controls'][] = array (
				'type' => 'buttons' ,
				'entries' => array (
//					array ( 'type' => 'green' , 'decision' => 'yes' , 'label' => 'Same topic' , 'api_action' => array ('action'=>'wbmergeitems','fromid'=>$q1,'toid'=>$q2,'ignoreconflicts'=>'label|description' ) ) ,
					array ( 'type' => 'white' , 'decision' => 'skip' , 'label' => 'Skip' ) ,
					array ( 'type' => 'blue' , 'decision' => 'no' , 'label' => 'Not listed, or does not apply' )
				)
			) ;
		
			$out['tiles'][] = $g ;
			
			if ( count($out['tiles']) == $num ) break ;
		}

	}


} else if ( $action == 'log_action' ) {

//	$ts = date ( 'YmdHis' ) ;
	$db = openToolDB ( 'merge_candidates' ) ;
	$user = $db->real_escape_string ( get_request ( 'user' , '' ) ) ;
	$tile = get_request ( 'tile' , 0 ) * 1 ;
	$decision = get_request ( 'decision' , '' ) ;
	
	$uid = getUID ( $db , $user ) ;
	
	$sql = "UPDATE coord_no_admin_unit SET done=1 WHERE id=$tile" ;
	$db->query($sql) ;
	$out['sql'][] = $sql ;

} else {
	$out['error'] = "No valid action!" ;
}


print $callback . '(' ;
print json_encode ( $out ) ;
print ")\n" ;

?>
