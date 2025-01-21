<?PHP

require_once ( './game1.inc' ) ;
require_once ( '/data/project/wikidata-game/scripts/games/WikidataGameHelper.php' ) ;


#header('Content-type: application/json');
header('Content-type: text/plain');

$callback = get_request ( 'callback' , '' ) ;
$action = get_request ( 'action' , '' ) ;

// Find more types:
// select instance_of,count(*) as cnt from no_image group by instance_of having cnt>=5 order by cnt desc
$types = [
	'person' => 5 ,
	'taxon' => 16521 ,
	'church' => 16970 ,
	'railway station' => 55488 ,
	'mountain' => 8502 ,
	'building' => 41176
] ;


$out = [] ;

if ( $action == 'desc' ) {

	$out = array (
		"label" => array ( "en" => "Items without image" ) ,
		"description" => array ( "en" => "These items have no image, but there are some on their Wikipedia articles." ) ,
		"instructions" => array ( "en" => "*Please, no more than one file per type (e.g., image, coat of arms) per item\n*Make sure the image depict the item!\n*Click 'no more images' once you have added all approriate files" ) ,
		"icon" => 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Gnome-emblem-photos.svg/120px-Gnome-emblem-photos.svg.png' ,
		'options' => array (
			array ( 'name' => 'Entry type' , 'key' => 'type' , 'values' => array ( 'any' => 'Any' ) )
		)
	) ;
	
	foreach ( $types AS $t => $q ) $out['options'][0]['values'][$t] = ucfirst($t) ;

} else if ( $action == 'tiles' ) {
	$wgh = new WikidataGameHelper ( $tfc ) ;
	$db = $wgh->db ;
	$dbwd = $wgh->dbwd ;
	$dbco = $wgh->dbco ;

	// GET parameters
	$num = get_request('num',1)*1 ; // Number of games to return
	$lang = get_request('lang','en') ; // The language to use, with 'en' as fallback; ignored in this game
	$hadthat = [] ;
	$type = get_request ( 'type' , 'any' ) ;
	
	$sql = "select count(*) AS cnt from no_image WHERE status is null" ;
	if ( isset($types[$type]) ) $sql .= " AND instance_of=" . $types[$type] . " " ;
	if(!$result = $db->query($sql)) die('There was an error running the query [' . $db->error . ']');
	while($o = $result->fetch_object()) {
		$out['left'] = $o->cnt*1 ;
		if ( $out['left'] < 50 ) $out['low'] = 1 ;
	}

	$cnt=0;
	$out['tiles'] = [] ;
	while ( count($out['tiles']) < $num ) {

		$r = rand() / getrandmax() ;
		$tmp = [] ;
		$sqls = [] ;
		$sql = "select no_image.*,(SELECT group_concat(image SEPARATOR '|' ) FROM image_candidates WHERE no_image.item=image_candidates.item) AS files FROM no_image WHERE status is null and random >= $r " ;
		if ( isset($types[$type]) ) $sql .= " AND instance_of=" . $types[$type] . " " ;
		if ( count ( $hadthat ) > 0 ) $sql .= " AND id NOT IN (" . implode(',',$hadthat) . ") " ;
		$sql .= " order by random" ;
		if ( $out['left'] > 100 ) $sql .= " limit " . ($num*4) ;
		if(!$result = $db->query($sql)) die('There was an error running the query [' . $db->error . ']');
		while($o = $result->fetch_object()){
			// Sanity checks
			if ( isDeleted ( $dbwd , $o->item ) ) {
				$sqls[] = "UPDATE no_image SET status='DEL' WHERE id=" . $o->id ;
				continue ;
			}
			if ( isRedirect ( $dbwd , $o->item ) ) {
				$sqls[] = "UPDATE no_image SET status='REDIR' WHERE id=" . $o->id ;
				continue ;
			}
			if ( hasLink ( $dbwd , $o->item , 'P18' ) ) { // Has image
				$sqls[] = "UPDATE no_image SET status='DONE' WHERE id=" . $o->id ;
				continue ;
			}
			if ( trim($o->files) == '' ) continue ;
			$files = explode ( '|' , $o->files ) ;
			if ( count($files) == 0 ) continue ;
			$f2 = [] ;
			foreach ( $files AS $f ) $f2[] = $dbco->real_escape_string ( str_replace ( ' ' , '_' , $f ) ) ;
			
			$o->files = [] ;
			$sql = "SELECT * FROM page WHERE page_namespace=6 AND page_title IN ('" . implode ( "','" , $f2 ) . "')" ;
			if(!$result2 = $dbco->query($sql)) die('There was an error running the query [' . $dbco->error . ']');
			while($o2 = $result2->fetch_object()) {
				$o->files[] = $o2->page_title ;
			}

			if ( count($o->files) > 5 ) continue ; // CUSTOM FILTER
			if ( count($o->files) == 0 ) continue ; // Paranoia
			$tmp[] = $o ;
		}

//		foreach ( $sqls AS $sql ) $db->query($sql) ; // Clean-up
		
		foreach ( $tmp AS $o ) {
			$hadthat[] = $o->id ;
			$g = array(
				'id' => $o->id ,
				'sections' => [] ,
				'controls' => []
			) ;
		
			$q = 'Q'.$o->item ;

			$g['sections'][] = array ( 'type' => 'item' , 'q' => $q ) ;
			$g['sections'][] = array ( 'type' => 'files' , 'files' => $o->files , 'item' => $q , 'deferred_decision' => 'yes' , 'section_empty_decision' => 'no' ) ;
			$g['controls'][] = array (
				'type' => 'buttons' ,
				'entries' => array (
					array ( 'type' => 'white' , 'decision' => 'skip' , 'label' => 'Skip' ) ,
					array ( 'type' => 'blue' , 'decision' => 'no' , 'label' => 'No more images' )
				)
			) ;
		
			$out['tiles'][] = $g ;
			
			if ( count($out['tiles']) == $num ) break ;
		}

		$cnt++ ;
		if($cnt>=10) break;
	}

} else if ( $action == 'log_action' ) {

	$ts = date ( 'YmdHis' ) ;
	$db = openToolDB ( 'merge_candidates' ) ;
	$user = $db->real_escape_string ( get_request ( 'user' , '' ) ) ;
	$tile = get_request ( 'tile' , 0 ) * 1 ;
	$decision = get_request ( 'decision' , '' ) ;
	
	$uid = getUID ( $db , $user ) ;
	
	$sql = "UPDATE no_image SET user=$uid,timestamp='$ts',status='" ;
	if ( $decision == 'yes' ) {
		$sql .= 'YES' ;
	} else if ( $decision == 'no' ) {
		$sql .= 'NO' ;
	} else {
		exit ( 0 ) ; // Something's wrong
	}
	$sql .= "' WHERE id=$tile AND status IS NULL" ;
	$db->query($sql) ;
	$out['sql'][] = $sql ;

	$sql = "UPDATE scores SET no_image=no_image+1 WHERE user=$uid" ;
	$db->query($sql) ;
	$out['sql'][] = $sql ;

} else {
	$out['error'] = "No valid action!" ;
}


if ( $callback == '' ) print  json_encode ( $out ) ;
else print $callback . '(' . json_encode ( $out ) . ")\n" ;
myflush() ;
exit(0);

?>
