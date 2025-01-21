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
		"label" => array ( "en" => "Books without author" ) ,
		"description" => array ( "en" => "These items about books have no author. Select one of the suggested ones linked from the associated Wikipedia articles. (Not many English books left, though...)" ) ,
		"icon" => 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Nuvola_apps_bookcase_1_blue.svg/120px-Nuvola_apps_bookcase_1_blue.svg.png'
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
		$use_labels = array() ;
		$sqls = array() ;
		$sql = "select * from potential_author WHERE status is null and random >= $r " ;
		if ( count ( $hadthat ) > 0 ) $sql .= " AND id NOT IN (" . implode(',',$hadthat) . ") " ;
		$sql .= " order by random limit " . ($num*2) ;
		if(!$result = $db->query($sql)) die('There was an error running the query [' . $db->error . ']');
		while($o = $result->fetch_object()){
			// Sanity checks
			if ( isDeleted ( $dbwd , $o->item ) ) {
				$sqls[] = "UPDATE item_pairs SET status='DEL' WHERE id=" . $o->id ;
				continue ;
			}
			if ( isRedirect ( $dbwd , $o->item ) ) {
				$sqls[] = "UPDATE potential_author SET status='REDIR' WHERE id=" . $o->id ;
				continue ;
			}
			if ( hasLink ( $dbwd , $o->item , 'P50' ) ) { // Has author
				$sqls[] = "UPDATE potential_author SET status='DONE' WHERE id=" . $o->id ;
				continue ;
			}
			
			$o->author = explode ( ',' , $o->author ) ;
			if ( count($o->author) > 5 ) continue ; // CUSTOM FILTER
			foreach ( $o->author AS $v ) $use_labels["Q$v"] = "Q$v" ;
			$tmp[] = $o ;
		}

		$wil->loadItems ( $use_labels ) ;
		
//		foreach ( $sqls AS $sql ) $db->query($sql) ; // Clean-up
		
		foreach ( $tmp AS $o ) {
			$hadthat = $o->id ;
			$g = array(
				'id' => $o->id ,
				'sections' => array () ,
				'controls' => array ()
			) ;
		
			$q = 'Q'.$o->item ;

			$entries = array() ;
			foreach ( $o->author AS $c ) {
				$i = $wil->getItem($c) ;
				$label = "Q$c" ;
				if ( $label == $q ) continue ; // Not in self...
				if ( isset($i) ) $label = $i->getLabel($lang) ;
				$a = array ( 'type' => 'green' , 'decision' => 'done' , 'label' => $label , 'api_action' => 
					array ('action'=>'wbcreateclaim','entity'=>"$q",'snaktype'=>'value','property'=>'P50',
						'value'=>'{"entity-type":"item","numeric-id":'.$c.'}'
					)
				) ;
				$entries[] = $a ;
			}
		
			$g['sections'][] = array ( 'type' => 'item' , 'q' => $q ) ;
			$g['controls'][] = array ( 'type' => 'buttons' , 'entries' => $entries ) ;
			$g['controls'][] = array (
				'type' => 'buttons' ,
				'entries' => array (
					array ( 'type' => 'white' , 'decision' => 'skip' , 'label' => 'Skip' ) ,
					array ( 'type' => 'blue' , 'decision' => 'no' , 'label' => 'Author not in list, or multiple authors' )
				)
			) ;
		
			$out['tiles'][] = $g ;
			
			if ( count($out['tiles']) == $num ) break ;
		}
	}

} else if ( $action == 'log_action' ) {

	$ts = date ( 'YmdHis' ) ;
	$db = openToolDB ( 'merge_candidates' ) ;
	$user = $db->real_escape_string ( get_request ( 'user' , '' ) ) ;
	$tile = get_request ( 'tile' , 0 ) * 1 ;
	$decision = get_request ( 'decision' , '' ) ;
	
	$uid = getUID ( $db , $user ) ;
	
	$sql = "UPDATE potential_author SET user=$uid,timestamp='$ts',status='" ;
	if ( $decision == 'yes' ) {
		$sql .= 'DONE' ;
	} else if ( $decision == 'no' ) {
		$sql .= 'NO' ;
	} else {
		exit ( 0 ) ; // Something's wrong
	}
	$sql .= "' WHERE id=$tile AND status IS NULL" ;
	$db->query($sql) ;
	$out['sql'][] = $sql ;

	$sql = "UPDATE scores SET potential_author=potential_author+1 WHERE user=$uid" ;
	$db->query($sql) ;
	$out['sql'][] = $sql ;

} else {
	$out['error'] = "No valid action!" ;
}


print $callback . '(' ;
print json_encode ( $out ) ;
print ")\n" ;

?>
