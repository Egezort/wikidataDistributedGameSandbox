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
		"label" => array ( "en" => "Alias candidates" ) ,
		"description" => array ( "en" => "Should this potential alias be added to the Wikidata item corresponding to the article? See [https://www.wikidata.org/wiki/Special:MyLanguage/Help:Aliases Help:Aliases] for guidance." ) ,
		"icon" => 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Alias.svg/120px-Alias.svg.png'
	) ;

} else if ( $action == 'tiles' ) {
	$db = openToolDB ( 'merge_candidates' ) ;
	$db->set_charset ( 'utf8' ) ;
	$dbwd = openDB ( 'wikidata' , 'wikidata' ) ;

	// GET parameters
	$num = get_request('num',1)*1 ; // Number of games to return
	$lang = get_request('lang','en') ; // The language to use, with 'en' as fallback; ignored in this game
	$hadthat = array() ;
	
	$out['tiles'] = array() ;
	while ( count($out['tiles']) < $num ) {

		$r = rand() / getrandmax() ;
		$tmp = array() ;
		$qs = array() ;
		$use_labels = array() ;
		$sqls = array() ;
		$sql = "select * from bold_aliases WHERE status is null and random >= $r AND lang='" . $db->real_escape_string($lang) . "'" ;
		if ( count ( $hadthat ) > 0 ) $sql .= " AND id NOT IN (" . implode(',',$hadthat) . ") " ;
		$sql .= " order by random limit " . ($num*2) ;
		if(!$result = $db->query($sql)) die('There was an error running the query [' . $db->error . ']'."\n$sql\n");
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
			
			$tmp[] = $o ;
			$qs[] = 'Q'.$o->item ;
		}
		
		$wil->loadItems ( $qs ) ;
		
//		foreach ( $sqls AS $sql ) $db->query($sql) ; // Clean-up
		
		foreach ( $tmp AS $o ) {
			$hadthat[] = $o->id ;
			$g = array(
				'id' => $o->id ,
				'sections' => array () ,
				'controls' => array ()
			) ;
			
			$wiki = $lang.'wiki' ;
			$q = 'Q'.$o->item ;
			$i = $wil->getItem ( $q ) ;
			if ( !isset($i) ) continue ;
			$title = $i->getSitelink($wiki) ;
			if ( !isset($title) ) continue ;

//			$g['sections'][] = array ( 'type' => 'item' , 'q' => $q ) ;
			$g['sections'][] = array ( 'type' => 'wikipage' , 'wiki' => $wiki , 'title' => $title ) ;
			$g['sections'][] = array ( 'type' => 'text' , 'title' => 'Potential alias' , 'text' => '" ' . $o->aliases . ' "' ) ;
			$g['controls'][] = array (
				'type' => 'buttons' ,
				'entries' => array (
					array ( 'type' => 'green' , 'decision' => 'yes' , 'label' => 'Add as "'.$o->lang.'" alias' ,
						'api_action' => array ('action'=>'wbsetaliases','id'=>"$q",'add'=>$o->aliases,'language'=>$o->lang)
					) ,
					array ( 'type' => 'white' , 'decision' => 'skip' , 'label' => 'Skip' ) ,
					array ( 'type' => 'blue' , 'decision' => 'no' , 'label' => 'Not an alias' )
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
	
	$sql = "UPDATE bold_aliases SET user=$uid,timestamp='$ts',status='" ;
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

	$sql = "UPDATE scores SET bold_aliases=bold_aliases+1 WHERE user=$uid" ;
	$db->query($sql) ;
	$out['sql'][] = $sql ;

} else {
	$out['error'] = "No valid action!" ;
}


print $callback . '(' ;
print json_encode ( $out ) ;
print ")\n" ;

?>
