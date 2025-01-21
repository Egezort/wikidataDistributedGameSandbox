<?PHP

require_once ( './game1.inc' ) ;

header('Content-type: application/json');

$callback = get_request ( 'callback' , '' ) ;
$action = get_request ( 'action' , '' ) ;

$out = array () ;

if ( $action == 'desc' ) {

	$out = array (
		"label" => array ( "en" => "Merge items" ) ,
		"description" => array ( "en" => "Some topics have duplicate items on Wikidata. Two items with the same title or alias will be suggested to you." ) ,
		"instructions" => array ( "en" => "*Please make sure that the items are really about the same entity!\n*Pay special attention to artwork (author, year, image), places (same administrative level?), and UK buildings (location, heritage ID)" ) ,
		"icon" => 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Pictogram_voting_merge.svg/120px-Pictogram_voting_merge.svg.png'
	) ;

} else if ( $action == 'tiles' ) {
	$db = openToolDB ( 'merge_candidates' ) ;
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
		$sql = "select * from item_pairs WHERE status is null and (language_subset like '%,".$db->real_escape_string($lang).",%' OR language_subset IN ('',',')) and random >= $r " ;
		if ( count ( $hadthat ) > 0 ) $sql .= " AND id NOT IN (" . implode(',',$hadthat) . ") " ;
		$sql .= " order by random limit " . ($num*5) ;

		if(!$result = $db->query($sql)) die('There was an error running the query [' . $db->error . ']');
		while($o = $result->fetch_object()){
			// Sanity checks
			if ( isDeleted ( $dbwd , $o->item1 ) or isDeleted ( $dbwd , $o->item2 ) ) {
				$sqls[] = "UPDATE item_pairs SET status='DEL' WHERE id=" . $o->id ;
				continue ;
			}
			if ( isRedirect ( $dbwd , $o->item1 ) or isRedirect ( $dbwd , $o->item2 ) ) {
				$sqls[] = "UPDATE item_pairs SET status='REDIR' WHERE id=" . $o->id ;
				continue ;
			}
			if ( hasLink ( $dbwd , $o->item1 , 'P359' ) and hasLink ( $dbwd , $o->item2 , 'P359' ) ) { # Rijksmonumenten
				$sqls[] = "UPDATE item_pairs SET status='RIJKSMON' WHERE id=" . $o->id ;
				continue ;
			}
			if ( hasLink ( $dbwd , $o->item1 , 'Q79007' ) or hasLink ( $dbwd , $o->item2 , 'Q79007' ) ) { # Dutch streets cluttering up results
				$sqls[] = "UPDATE item_pairs SET status='STREET' WHERE id=" . $o->id ;
				continue ;
			}
			if ( hasLink ( $dbwd , $o->item1 , 'Q'.$o->item2 ) or hasLink ( $dbwd , $o->item2 , 'Q'.$o->item1 ) ) {
				$sqls[] = "UPDATE item_pairs SET status='LINK' WHERE id=" . $o->id ;
				continue ;
			}
			if ( hasLink ( $dbwd , $o->item1 , 'Q202444' ) or hasLink ( $dbwd , $o->item2 , 'Q202444' ) ) {
				$sqls[] = "UPDATE item_pairs SET status='NAME' WHERE id=" . $o->id ;
				continue ;
			}
			if ( hasLink ( $dbwd , $o->item1 , 'P703' ) or hasLink ( $dbwd , $o->item2 , 'P703' ) ) { // "Found in taxon"; gene/protein hell
				$sqls[] = "UPDATE item_pairs SET status='IN_SPECIES' WHERE id=" . $o->id ;
				continue ;
			}
			if ( hasLink ( $dbwd , $o->item1 , 'Q3305213' ) or hasLink ( $dbwd , $o->item2 , 'Q3305213' ) ) { // paintings
				$sqls[] = "UPDATE item_pairs SET status='PAINTING' WHERE id=" . $o->id ;
				continue ;
			}
			if ( hasLink ( $dbwd , $o->item1 , 'Q19389637' ) or hasLink ( $dbwd , $o->item2 , 'Q19389637' ) ) { // Wikisource datasets
				$sqls[] = "UPDATE item_pairs SET status='BIO' WHERE id=" . $o->id ;
				continue ;
			}
			if ( doShareSitelinks ( $dbwd , $o->item1 , $o->item2 ) ) {
				$sqls[] = "UPDATE item_pairs SET status='SITELINKS' WHERE id=" . $o->id ;
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
		
			$q1 = 'Q'.$o->item1 ;
			$q2 = 'Q'.$o->item2 ;
			if ( $o->item1*1 > $o->item2*1 ) {
				$q1 = 'Q'.$o->item2 ;
				$q2 = 'Q'.$o->item1 ;
			}
		
			$g['sections'][] = array ( 'type' => 'item' , 'q' => $q1 ) ;
			$g['sections'][] = array ( 'type' => 'item' , 'q' => $q2 ) ;
			$g['controls'][] = array (
				'type' => 'buttons' ,
				'entries' => array (
					array ( 'type' => 'green' , 'decision' => 'yes' , 'label' => 'Same topic' , 'api_action' => array ('action'=>'wbmergeitems','fromid'=>$q2,'toid'=>$q1,'ignoreconflicts'=>'description' ) ) ,
					array ( 'type' => 'white' , 'decision' => 'skip' , 'label' => 'Skip' ) ,
					array ( 'type' => 'blue' , 'decision' => 'no' , 'label' => 'Different' )
				)
			) ;
		
			$out['tiles'][] = $g ;
		}
	}

} else if ( $action == 'log_action' ) {

	$ts = date ( 'YmdHis' ) ;
	$db = openToolDB ( 'merge_candidates' ) ;
	$user = $db->real_escape_string ( get_request ( 'user' , '' ) ) ;
	$tile = get_request ( 'tile' , 0 ) * 1 ;
	$decision = get_request ( 'decision' , '' ) ;
	
	$uid = getUID ( $db , $user ) ;
	
	$sql = "UPDATE item_pairs SET user=$uid,timestamp='$ts',status='" ;
	if ( $decision == 'yes' ) {
		$sql .= 'SAME' ;
	} else if ( $decision == 'no' ) {
		$sql .= 'DIFF' ;
	} else {
		exit ( 0 ) ; // Something's wrong
	}
	$sql .= "' WHERE id=$tile AND status IS NULL" ;
	$db->query($sql) ;
	$out['sql'][] = $sql ;

	$sql = "UPDATE scores SET item_pairs=item_pairs+1 WHERE user=$uid" ;
	$db->query($sql) ;
	$out['sql'][] = $sql ;

} else {
	$out['error'] = "No valid action!" ;
}


print $callback . '(' ;
print json_encode ( $out ) ;
print ")\n" ;

?>
