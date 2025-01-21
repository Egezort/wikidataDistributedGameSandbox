<?PHP

require_once ( './game1.inc' ) ;

header('Content-type: application/json');

$callback = get_request ( 'callback' , '' ) ;
$action = get_request ( 'action' , '' ) ;

$out = array () ;

if ( $action == 'desc' ) {

	$out = array (
		"label" => array ( "en" => "Duplicate authors" ) ,
		"description" => array ( "en" => "Two co-authors that share the same last name, making them potential duplicates." ) ,
		"instructions" => array ( "en" => "*Please make sure that the items are really about the same entity!" ) ,
		"icon" => 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Painting_by_Sebastian_Bieniek._Titled_%E2%80%9EDoppelg%C3%A4nger_No._1%E2%80%9C%2C_2018._Oil_on_canvas._Berlin_based_artist._Painter.jpg/120px-Painting_by_Sebastian_Bieniek._Titled_%E2%80%9EDoppelg%C3%A4nger_No._1%E2%80%9C%2C_2018._Oil_on_canvas._Berlin_based_artist._Painter.jpg'
	) ;

} else if ( $action == 'tiles' ) {
	$db = openToolDB ( 'author_duplicates_p' ) ;
	$dbwd = openDB ( 'wikidata' , 'wikidata' ) ;

	// GET parameters
	$num = get_request('num',1)*1 ; // Number of games to return
	$lang = get_request('lang','en') ; // The language to use, with 'en' as fallback
	$hadthat = array() ;
	

	$out['tiles'] = array() ;
	while ( count($out['tiles']) < $num ) {

		$r = rand() / getrandmax() ;
		$tmp = array() ;
		$sqls = array() ;
		$sql = "select * from author_pairs WHERE status='OPEN' and random >= $r " ;
		if ( count ( $hadthat ) > 0 ) $sql .= " AND id NOT IN (" . implode(',',$hadthat) . ") " ;
		$sql .= " order by random limit " . ($num*5) ;

		if(!$result = $db->query($sql)) die('There was an error running the query [' . $db->error . ']');
		while($o = $result->fetch_object()){
			// Sanity checks
			if ( isDeleted ( $dbwd , $o->q1 ) or isDeleted ( $dbwd , $o->q2 ) ) {
				$sqls[] = "UPDATE author_pairs SET status='DEL' WHERE id=" . $o->id ;
				continue ;
			}
			if ( isRedirect ( $dbwd , $o->q1 ) or isRedirect ( $dbwd , $o->q2 ) ) {
				$sqls[] = "UPDATE author_pairs SET status='REDIR' WHERE id=" . $o->id ;
				continue ;
			}		
			$tmp[] = $o ;
			
			if ( count($tmp) == $num ) break ;
		}
		
#if ( isset($_REQUEST['test']) ) { $out['tmp'] = $tmp ; $out['sqls'] = $sqls ; break; }
		foreach ( $sqls AS $sql ) $db->query($sql) ; // Clean-up
		
		foreach ( $tmp AS $o ) {
			$hadthat[] = $o->id ;
			$g = array(
				'id' => $o->id ,
				'sections' => array () ,
				'controls' => array ()
			) ;
		
			$q1 = 'Q'.$o->q1 ;
			$q2 = 'Q'.$o->q2 ;
			if ( $o->q1*1 > $o->q2*1 ) {
				$q1 = 'Q'.$o->q2 ;
				$q2 = 'Q'.$o->q1 ;
			}
		
			$g['sections'][] = array ( 'type' => 'item' , 'q' => $q1 ) ;
			$g['sections'][] = array ( 'type' => 'item' , 'q' => $q2 ) ;
			$g['controls'][] = array (
				'type' => 'buttons' ,
				'entries' => array (
					array ( 'type' => 'green' , 'decision' => 'yes' , 'label' => 'Same researcher' , 'api_action' => array ('action'=>'wbmergeitems','fromid'=>$q2,'toid'=>$q1,'ignoreconflicts'=>'description' ) ) ,
					array ( 'type' => 'white' , 'decision' => 'skip' , 'label' => 'Skip' ) ,
					array ( 'type' => 'blue' , 'decision' => 'no' , 'label' => 'Different' )
				)
			) ;
		
			$out['tiles'][] = $g ;
		}
	}

} else if ( $action == 'log_action' ) {

	$ts = date ( 'YmdHis' ) ;
	$db = openToolDB ( 'author_duplicates_p' ) ;
	$user = $db->real_escape_string ( get_request ( 'user' , '' ) ) ;
	$tile = get_request ( 'tile' , 0 ) * 1 ;
	$decision = get_request ( 'decision' , '' ) ;
	
	$uid = getUID ( $db , $user ) ;
	
	$sql = "UPDATE `author_pairs` SET `timestamp`='$ts',`user`=$uid,`status`='" ;
	if ( $decision == 'yes' ) {
		$sql .= 'SAME' ;
	} else if ( $decision == 'no' ) {
		$sql .= 'DIFF' ;
	} else {
		exit ( 0 ) ; // Something's wrong
	}
	$sql .= "' WHERE `id`=$tile AND `status`='OPEN'" ;
	$db->query($sql) ;
	$out['sql'][] = $sql ;

	// $sql = "UPDATE scores SET author_pairs=author_pairs+1 WHERE user=$uid" ;
	// $db->query($sql) ;
	// $out['sql'][] = $sql ;

} else {
	$out['error'] = "No valid action!" ;
}


print $callback . '(' ;
print json_encode ( $out ) ;
print ")\n" ;

?>
