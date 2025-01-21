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
		"label" => array ( "en" => "African Americans" ) ,
		"description" => array ( "en" => "A game for Black History Month 2017. Set the ethnicity tag for African American people." ) ,
		"icon" => 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Martin_Luther_King_Jr_NYWTS.jpg/120px-Martin_Luther_King_Jr_NYWTS.jpg'
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
//		$use_labels = array() ;
		$sqls = array() ;
		$sql = "select * from african_americans WHERE done=0 and random >= $r " ;
		if ( count ( $hadthat ) > 0 ) $sql .= " AND id NOT IN (" . implode(',',$hadthat) . ") " ;
		$sql .= " order by random limit " . ($num*2) ;
		if(!$result = $db->query($sql)) die('There was an error running the query [' . $db->error . ']');
		while($o = $result->fetch_object()){
			// Sanity checks
			if ( isDeleted ( $dbwd , $o->item ) ) {
				$sqls[] = "UPDATE african_americans SET done=1 WHERE id=" . $o->id ;
				continue ;
			}
			if ( isRedirect ( $dbwd , $o->item ) ) {
				$sqls[] = "UPDATE african_americans SET done=1 WHERE id=" . $o->id ;
				continue ;
			}
			if ( !hasLink ( $dbwd , $o->item , 'Q5' ) ) { // No human
				$sqls[] = "UPDATE african_americans SET done=1 WHERE id=" . $o->id ;
				continue ;
			}
			if ( hasLink ( $dbwd , $o->item , 'P172' ) ) { // Has ethnicity
				$sqls[] = "UPDATE african_americans SET done=1 WHERE id=" . $o->id ;
				continue ;
			}
			
			$tmp[] = $o ;
		}

//		$wil->loadItems ( $use_labels ) ;
		
		foreach ( $sqls AS $sql ) $db->query($sql) ; // Clean-up

		foreach ( $tmp AS $o ) {
			$hadthat = $o->id ;
			$g = array(
				'id' => $o->id ,
				'sections' => array () ,
				'controls' => array ()
			) ;
		
			$q = 'Q'.$o->item ;

			$ok = array ( 'type' => 'green' , 'decision' => 'done' , 'label' => "African American" , 'api_action' => 
				array ('action'=>'wbcreateclaim','entity'=>"$q",'snaktype'=>'value','property'=>'P172',
					'value'=>'{"entity-type":"item","numeric-id":49085}'
				)
			) ;
		
			$g['sections'][] = array ( 'type' => 'item' , 'q' => $q ) ;
			$g['controls'][] = array (
				'type' => 'buttons' ,
				'entries' => array (
					$ok ,
					array ( 'type' => 'white' , 'decision' => 'skip' , 'label' => 'Skip' ) ,
					array ( 'type' => 'blue' , 'decision' => 'no' , 'label' => 'Not an African American' )
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

	$sql = "UPDATE african_americans SET user=$uid,timestamp='$ts',done=1 WHERE id=$tile AND done=0" ;
	$db->query($sql) ;
	$out['sql'][] = $sql ;

//	$sql = "UPDATE scores SET potential_author=potential_author+1 WHERE user=$uid" ;
//	$db->query($sql) ;
//	$out['sql'][] = $sql ;

} else {
	$out['error'] = "No valid action!" ;
}


print $callback . '(' ;
print json_encode ( $out ) ;
print ")\n" ;

?>
