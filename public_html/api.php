<?PHP

ini_set('memory_limit','200M');
set_time_limit ( 30 ) ; // Seconds

require_once ( 'php/common.php' ) ;

header("Connection: close");
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Content-type: application/json');
//header('Content-type: text/plain'); // FOR TESTING

$start_time = microtime(true) ;

// K=>V is table_name => mode_name
$tables = array (
	'genderless_people' => 'nogender' ,
	// 'item_pairs' => 'merge' ,
	'potential_people' => 'person' ,
	'potential_nationality' => 'nationality' ,
	'potential_occupation' => 'occupation' ,
	'potential_author' => 'no_author' ,
	'potential_alma_mater' => 'alma_mater' ,
	'people_no_date' => 'no_date' ,
	'no_image' => 'no_image' ,
	'potential_new_pages' => 'no_item' ,
	'potential_commonscat' => 'commonscat' ,
	'potential_disambig' => 'disambig'
) ;

$mysql_timeout_min = 5 ;

$db = openToolDB ( 'merge_candidates' , 'p:tools-db' ) ; # p::tools-db for persistent connection
$dbwd = openDB ( 'wikidata' , 'wikidata' ) ;

$db->options ( MYSQLI_OPT_CONNECT_TIMEOUT , 60*$mysql_timeout_min ) ;
$dbwd->options ( MYSQLI_OPT_CONNECT_TIMEOUT , 60*$mysql_timeout_min ) ;

$action = get_request ( 'action' , '' ) ;
$user = $db->real_escape_string ( trim ( get_request ( 'user' , '' ) ) ) ;
$user_settings = array() ;
$item = intval( get_request ( 'item' , 0 ) ) ;

$out = array ( 'status' => 'OK' ) ;

function doesItemExist ( $item ) { // numeric
	global $dbwd ;
	$ret = false ;
	$sql = "select * from page WHERE page_namespace=0 AND page_title='Q$item'" ;
	if(!$result = $dbwd->query($sql)) die('1 There was an error running the query [' . $db->error . ']'.$sql);
	while($o = $result->fetch_object()){ $ret = true ; }
	return $ret ;
}

function doesItemHaveLink ( $item , $target ) {
	global $dbwd ;
	$ret = false ;
	$ns = 0 ;
	if ( substr($target,0,1) == 'P' ) $ns = 120 ;
	$sql = "select * from page,pagelinks,linktarget where pl_target_id=lt_id AND page_title='Q$item' AND page_namespace=0 AND page_id=pl_from AND lt_namespace=$ns AND lt_title='$target' LIMIT 1" ;
	if(!$result = $dbwd->query($sql)) die('2 There was an error running the query [' . $db->error . ']'.$sql);
	while($o = $result->fetch_object()){ $ret = true ; }
	return $ret ;
}

function getUserID ( $user ) {
	global $db , $user_settings , $out ;
	$user_settings = array() ;
	$ret = '' ;
	if ( $user == '' ) return 0 ;
	$sql = "SELECT * FROM users WHERE name='$user'" ;
	if(!$result = $db->query($sql)) die('3 There was an error running the query [' . $db->error . ']');
	while($o = $result->fetch_object()){
		$ret = $o->id ;
		if ( $o->settings != '' ) {
			$user_settings = json_decode ( $o->settings ) ;
		}
	}
	if ( $ret != '' ) return $ret * 1 ;
	
	$sql = "INSERT INTO users (name) VALUES ('$user')" ;
	if(!$result = $db->query($sql)) die('4 There was an error running the query [' . $db->error . ']');
	$uid = getUserID ( $user ) ;
	$sql = "INSERT IGNORE INTO scores (user) VALUES ($uid)" ;
	if(!$result = $db->query($sql)) die('4a There was an error running the query [' . $db->error . ']');
	
	return $uid ;
}


function inc_score ( $user_id , $field ) { // $user_id and $field are trusted
	global $db ;
	$sql = "UPDATE scores SET $field=$field+1 WHERE user=$user_id" ;
	if(!$result = $db->query($sql)) die('5 There was an error running the query [' . $db->error . ']');
}

function setGameRowStatus ( $table , $id , $status ) {
	global $db ;
	$sql = "UPDATE $table SET status='$status' WHERE status IS NULL AND id=$id" ;
	if(!$result = $db->query($sql)) die('6 There was an error running the query [' . $db->error . '] '.$sql);
}

function deleteGameRow ( $table , $id ) {
	setGameRowStatus ( $table , $id , 'DEL' ) ;
}

function checkSpecialConditions ( $table , $x ) { // Verifies special conditions for game candidates. Returns true if all is OK.
	global $db , $dbwd ;

	if ( $table == 'genderless_people' ) {
		if ( !doesItemExist($x->item) or doesItemHaveLink($x->item,'P21') or !doesItemHaveLink($x->item,'Q5') ) { // Check for gender link; ensure human link
			deleteGameRow ( $table , $x->id ) ;
			return false ;
		}
	}

	if ( $table == 'potential_people' ) {
		if ( !doesItemExist($x->item) or doesItemHaveLink($x->item,'P31') or doesItemHaveLink($x->item,'P131') 
			 or doesItemHaveLink($x->item,'P105') or doesItemHaveLink($x->item,'P171') or doesItemHaveLink($x->item,'P17') 
		) { // Check for contra-indicative properties
			deleteGameRow ( $table , $x->id ) ;
			return false ;
		}
	}
	
	if ( $table == 'potential_nationality' ) {
		if ( !doesItemExist($x->item) or doesItemHaveLink($x->item,'P27') ) { // Check for nationality link
			deleteGameRow ( $table , $x->id ) ;
			return false ;
		}
	}
	
	if ( $table == 'potential_occupation' ) {
		if ( !doesItemExist($x->item) or doesItemHaveLink($x->item,'P106') or !doesItemHaveLink($x->item,'P31')  or !doesItemHaveLink($x->item,'Q5') ) { // Check for occupation/human link
			deleteGameRow ( $table , $x->id ) ;
			return false ;
		}
	}

	if ( $table == 'potential_author' ) {
		if ( !doesItemExist($x->item) or doesItemHaveLink($x->item,'P50') or !doesItemHaveLink($x->item,'P31')  or !doesItemHaveLink($x->item,'Q571') ) { // Check for author/book link
			deleteGameRow ( $table , $x->id ) ;
			return false ;
		}
	}

	if ( $table == 'potential_alma_mater' ) {
		if ( !doesItemExist($x->item) or doesItemHaveLink($x->item,'P69') or !doesItemHaveLink($x->item,'P31')  or !doesItemHaveLink($x->item,'Q5') ) { // Check for nationality link
			deleteGameRow ( $table , $x->id ) ;
			return false ;
		}
	}
	
	if ( $table == 'potential_disambig' ) {
		if ( !doesItemExist($x->item) or doesItemHaveLink($x->item,'P31') ) { // Check for instance-of link
			deleteGameRow ( $table , $x->id ) ;
			return false ;
		}
	}

	if ( $table == 'no_image' ) {
		if ( !doesItemExist($x->item) or doesItemHaveLink($x->item,'P18') or doesItemHaveLink($x->item,'Q13406463') ) { // Check for image
			deleteGameRow ( $table , $x->id ) ;
			$sql = "DELETE FROM image_candidates WHERE item=" . $x->item ;
			if(!$result = $db->query($sql)) die('9 There was an error running the query [' . $db->error . ']');
			return false ;
		}
	}

	if ( $table == 'potential_commonscat' ) {
		if ( !doesItemExist($x->item) or doesItemHaveLink($x->item,'P373') or doesItemHaveLink($x->item,'Q4167410') ) { // Check for commonc category/disambig
			deleteGameRow ( $table , $x->id ) ;
			return false ;
		}
	}
	
	if ( $table == 'people_no_date' ) {
		if ( !doesItemExist($x->item) or !doesItemHaveLink($x->item,'P31')  or !doesItemHaveLink($x->item,'Q5') or doesItemHaveLink($x->item,'P360') ) { // Check for person, not "list of"
			deleteGameRow ( $table , $x->id ) ;
			return false ;
		}
		if ( doesItemHaveLink($x->item,'P569') and doesItemHaveLink($x->item,'P570') ) { // Has both dates?
				deleteGameRow ( $table , $x->id ) ;
				return false ;
		}
	}
	
	// if ( $table == 'item_pairs' ) {
	// 	if ( !doesItemExist($x->item1) or !doesItemExist($x->item2) ) { // One item is deleted
	// 		deleteGameRow ( $table , $x->id ) ;
	// 		return false ;
	// 	} else if ( doesItemHaveLink($x->item1,'Q4167410') or doesItemHaveLink($x->item2,'Q4167410') ) { // One is a disambiguation page
	// 		$sql = "UPDATE item_pairs SET status='DIS' WHERE id=" . $x->id ;
	// 		if(!$result = $db->query($sql)) die('8 There was an error running the query [' . $db->error . ']');
	// 		return false ;
	// 	} else if ( doesItemHaveLink($x->item1,'Q1077333') or doesItemHaveLink($x->item2,'Q1077333') ) { // Whitelist "administrative territorial entity of Thailand"
	// 		$sql = "UPDATE item_pairs SET status='WHITE' WHERE id=" . $x->id ;
	// 		if(!$result = $db->query($sql)) die('9 There was an error running the query [' . $db->error . ']');
	// 		return false ;
	// 	}
		
	// 	if ( doesItemHaveLink($x->item1,'Q'.$x->item2) or doesItemHaveLink($x->item2,'Q'.$x->item1) ) { // Items link to each other
	// 		setGameRowStatus ( $table , $x->id , 'LINK' ) ;
	// 		return false ;
	// 	}

	// 	if ( doesItemHaveLink($x->item1,'Q202444') or doesItemHaveLink($x->item2,'Q202444') ) { // Given name
	// 		setGameRowStatus ( $table , $x->id , 'NAME' ) ;
	// 		return false ;
	// 	}
	// }

	if ( $table == 'potential_new_pages' ) {
		
		// Has an item by now?
		$site = $x->site ;
		$t = $dbwd->real_escape_string ( $x->page ) ;
		$sql = "SELECT count(*) AS cnt FROM wb_items_per_site WHERE ips_site_id='$site' AND ips_site_page='$t' LIMIT 1" ;
		if(!$r2 = $dbwd->query($sql)) die('2 There was an error running the query [' . $dbwd->error . ']'.$sql);
		$o2 = $r2->fetch_object() ;
		if ( $o2->cnt > 0 ) {
			setGameRowStatus ( $table , $x->id , 'WD_DONE' ) ;
			return false ;
		}
		
		// Does the page still exist?
		if ( !preg_match('/^(.+)(wik[a-z]+)$/',$x->site,$l) ) return false ; // WTF?
		if ( $l[2] == 'wiki' ) $l[2] = 'wikipedia' ;
		$dbwp = openDB ( $l[1] , $l[2] ) ;
		$t = $dbwp->real_escape_string ( str_replace ( ' ' , '_' , $x->page ) ) ;
		$sql = "SELECT count(*) AS cnt FROM page WHERE page_namespace=0 and page_title='$t' LIMIT 1" ;
		if(!$r2 = $dbwp->query($sql)) die('3 There was an error running the query [' . $dbwp->error . ']'.$sql);
		$o2 = $r2->fetch_object() ;
		if ( $o2->cnt == 0 ) {
			setGameRowStatus ( $table , $x->id , 'DELETED' ) ;
			return false ;
		}
	}
	
	return true ; // Default
}

function getUserLanguageConditions ( $field ) {
	global $user_settings , $db , $dbwd , $out ;
	$whitelist = array() ;
	$blacklist = array() ;
	$whitelist_exclusive = false ;
	if ( isset($user_settings->whitelist) ) $whitelist = explode ( ',' , preg_replace('/\s/','',trim($user_settings->whitelist)) ) ;
	if ( isset($user_settings->blacklist) ) $blacklist = explode ( ',' , preg_replace('/\s/','',trim($user_settings->blacklist)) ) ;
	if ( isset($user_settings->whitelist_exclusive) ) $whitelist_exclusive = $user_settings->whitelist_exclusive ;
	if ( count($whitelist) + count($blacklist) == 0 ) return '' ; // No filters, OK!

	$ret = array() ;
	foreach ( $whitelist AS $w ) {
		if ( $w == '' ) continue ;
		$ret[] = " $field LIKE '%," . $db->real_escape_string($w) . ",%'" ;
	}
	foreach ( $blacklist AS $w ) {
		if ( $w == '' ) continue ;
		$ret[] = " $field NOT LIKE '%," . $db->real_escape_string($w) . ",%'" ;
	}
	
	if ( count($ret) == 0 ) $ret[] = '1=1' ;
	
	return " (" . implode(" AND ",$ret) . ") " ;
}


function checkSettingLanguages ( $item ) {
	global $user_settings , $db , $dbwd , $out ;
	$whitelist = array() ;
	$blacklist = array() ;
	$whitelist_exclusive = false ;
	if ( isset($user_settings->whitelist) ) $whitelist = explode ( ',' , preg_replace('/\s/','',trim($user_settings->whitelist)) ) ;
	if ( isset($user_settings->blacklist) ) $blacklist = explode ( ',' , preg_replace('/\s/','',trim($user_settings->blacklist)) ) ;
	if ( isset($user_settings->whitelist_exclusive) ) $whitelist_exclusive = $user_settings->whitelist_exclusive ;

	if ( count($whitelist) + count($blacklist) == 0 ) return true ; // No filters, pass!
	
//	$out['log'][] = "Checking Q$item" ;
	
	$sql = "SELECT ips_site_id FROM wb_items_per_site WHERE ips_item_id=$item" ;
	if(!$result = $dbwd->query($sql)) die('1f There was an error running the query [' . $dbwd->error . ']'.$sql);
	$has_whitelist = false ;
	$has_other_than_blacklist = false ;
	while($o = $result->fetch_object()) {
		if ( !preg_match('/^(.+)wik[a-z]+$/',$o->ips_site_id,$l) ) continue ;
		if ( in_array ( $l[1] , $whitelist ) ) $has_whitelist = true ;
		if ( !in_array ( $l[1] , $blacklist ) ) $has_other_than_blacklist = true ;
	}
	
	if ( !$has_other_than_blacklist ) return false ;
	if ( $whitelist_exclusive and !$has_whitelist ) return false ;
	
	return true ;	
}

function checkUserConditions ( $table , $x ) { // Filters for user settings
	global $user_settings , $out ;
	
	if ( $table == 'potential_new_pages' ) {
		preg_match('/^(.+)wik[a-z]+$/',$x->site,$l) ;
		if ( in_array ( $l[1] , $user_settings->whitelist ) ) return true ;
		if ( !in_array ( $l[1] , $user_settings->blacklist ) ) return true ;
		return false ;
	// } else if ( $table == 'item_pairs' ) {
	} else if ( $table == 'no_image' ) {
		if ( isset($user_settings->image_instance) and $user_settings->image_instance != '' and !doesItemHaveLink($x->item,'Q'.$user_settings->image_instance) ) return false ;
	} else {
		if ( !checkSettingLanguages($x->item) ) return false ;
	}

	
	return true ; // Default
}


function specialAdditionalData ( $table , $x ) {
	global $out , $db , $dbwd ;
	
	if ( $table == 'no_image' ) {
		$sql = "SELECT * FROM image_candidates WHERE item=" . $x->item ;
		if(!$result = $db->query($sql)) die('x1 There was an error running the query [' . $db->error . ']');
		$out['data']->candidates = array() ;
		while($o = $result->fetch_object()) {
			$x->candidates[] = $o->image ;
		}
		if ( count ( $x->candidates ) == 0 ) return false ; // Paranoia
	}

	if ( $table == 'potential_new_pages' ) {
		$candidates = array() ;
		$t = $dbwd->real_escape_string ( $x->page ) ;
		
		$t = preg_replace ( '/\s*\(.+$/' , '' , $t ) ;

		$sql_base = "SELECT DISTINCT term_full_entity_id FROM wb_terms WHERE term_entity_type='item' AND term_type IN ('label','alias') AND " ;
		$sql = "$sql_base term_text='$t'" ;
		if(!$result = $dbwd->query($sql)) die('x1 There was an error running the query [' . $dbwd->error . ']');
		while($o = $result->fetch_object()) {
			$candidates[$o->term_full_entity_id] = 1 ;
		}
		
		$t2 = explode ( ' ' , $t ) ;
		if ( count ( $t2 ) > 1 and count($candidates) == 0 ) {
			$t3 = array() ;
			foreach ( $t2 AS $part ) {
				if ( strlen ( $part ) < 4 ) continue ;
				$t3[] = "(term_text = \"$part\")" ;
			}
			$sql = "$sql_base " . implode ( " OR " , $t3 ) . " LIMIT 20" ;
			if(!$result = $dbwd->query($sql)) die('x1 There was an error running the query [' . $dbwd->error . ']');
			while($o = $result->fetch_object()) {
				$candidates[$o->term_full_entity_id] = 1 ;
			}
		}


		$x->candidates = array_keys($candidates) ;
	}

	return true ;
}

function getCandidatesFromTable ( $table ) {
	global $db , $tables , $out ;
	$ret = false ;
	$max_attempts = 10 ;
	$cache = array() ;
	$cache_size = 1000 ;
	if ( in_array($table,array('no_image','potential_commonscat','potential_occupation','potential_author','potential_alma_mater')) ) $cache_size = 20 ;

	while ( isset ( $tables[$table] ) ) { // Pre-defined table names only, no need to escape
		while ( $max_attempts > 0 and count ( $cache ) == 0 ) {
			$r = rand() / getrandmax() ;
			$sql = "SELECT * FROM $table WHERE status IS NULL AND random >= $r" ;
			
			// if ( $table == 'item_pairs' ) {
			// 	$lc = getUserLanguageConditions('language_subset') ;
			// 	if ( trim($lc) != '' ) $sql .= " AND " . $lc ;
			// }
			
			$sql .= " ORDER BY random LIMIT $cache_size" ; // 
//			$out['sql'] = $sql ;
//			print "$sql\n" ;
			
			if(!$result = $db->query($sql)) die('11 There was an error running the query [' . $db->error . '] '.$sql);
			while($o = $result->fetch_object()) {
				if ( isset($o->status) ) continue ;
				$cache[] = $o ;
			}
			$max_attempts-- ;
		}
		shuffle ( $cache ) ; // Because I can!
		foreach ( $cache AS $k => $v ) {
			if ( !checkUserConditions ( $table , $v ) ) continue ;
			if ( !checkSpecialConditions ( $table , $v ) ) continue ;
			if ( !specialAdditionalData ( $table , $v ) ) continue ;
			$ret = $v ;
			break ;
		}

		if ( $ret !== false ) break ;
		
		$cache = array() ;
		if ( $max_attempts <= 0 ) break ; // Well, you had your chance...
		
//		print "$table\t$max_attempts\n" ; myflush();
//		break ; // TESTING FIXME
	}
//	if ( false != $ret ) $ret['attempts_left'] = $max_attempts ;
	return $ret ;
}


/********************************************************************************************************************************************
 action
*********************************************************************************************************************************************/

if ( $action == 'get_candidate' ) {


	$uid = getUserID($user) ;
//	$out['log'][] = "$user => $uid" ;

//	$table = $db->real_escape_string ( trim ( get_request ( 'table' , '' ) ) ) ;
	$table = get_request ( 'table' , '' ) ;
	if ( $table == 'all' ) {
		$tk = array ( 'potential_people' , 'potential_nationality' , 'potential_occupation' , 'potential_author' , 'people_no_date' , 'potential_commonscat' , 'potential_alma_mater' ) ;
	// EXPENSIVE:  'no_image' , 'item_pairs', 'genderless_people'  ,  ) ;
	// DONE : 'potential_disambig'

		foreach ( $tk AS $table ) {
			$out['data'][$table] = getCandidatesFromTable ( $table ) ;
		}
	} else {
		$out['data'] = getCandidatesFromTable ( $table ) ;
	}

} else if ( $action == 'get_potential_occupations' ) {

        if ( $item ) {
                $sql = "SELECT occupation FROM potential_occupation WHERE status IS NULL AND item = $item LIMIT 1";
                $result = $db->query( $sql );
                if ( !$result ) die( '11 There was an error running the query [' . $db->error . '] '.$sql );
                $x = $result->fetch_array();
                if ( $x ) {
                        $out['data'] = $x[0];
                } else {
                        $out['data'] = false;
                }
        } else {
                $out['status'] = 'Invalid input';
        }

} else if ( $action == 'get_settings' ) {

	$uid = getUserID($user) ;
	
	$sql = "SELECT * FROM users WHERE id=$uid" ;
	if(!$result = $db->query($sql)) die('11 There was an error running the query [' . $db->error . '] '.$sql);
	$x = $result->fetch_object() ;
	$out['data'] = $x->settings ;

} else if ( $action == 'get_user_history' ) {

	$uid = getUserID($user) ;
	$out['data'] = array() ;
	foreach ( $tables AS $table => $mode ) {
		$sql = "SELECT * FROM $table WHERE user=$uid ORDER BY timestamp DESC LIMIT 20" ;
		if(!$result = $db->query($sql)) die('11 There was an error running the query [' . $db->error . ']: '.$sql);
		while($o = $result->fetch_object()) {
			$o->mode = $mode ;
			$out['data'][] = $o ;
		}
	}

} else if ( $action == 'set_settings' ) {

	$uid = getUserID($user) ;
	$settings = $db->real_escape_string ( get_request ( 'settings' , '' ) ) ;
	
	$sql = "UPDATE users SET settings='$settings' WHERE id=$uid" ;
	if(!$result = $db->query($sql)) die('11 There was an error running the query [' . $db->error . '] '.$sql);

} else if ( $action == 'set_status' ) {

	$uid = getUserID($user) ;
	$id = get_request ( 'id' , '' ) * 1 ;
	$status = $db->real_escape_string ( trim ( get_request ( 'status' , '' ) ) ) ;
	$table = $db->real_escape_string ( trim ( get_request ( 'table' , '' ) ) ) ;
	$ts = date ( 'YmdHis' ) ;
	
	if ( $id > 0 and $uid > 0 and $status != '' ) {
		$sql = "UPDATE $table SET status='$status',user=$uid,timestamp='$ts' WHERE id=$id AND status IS NULL" ;
		if(!$result = $db->query($sql)) die('10 There was an error running the query [' . $db->error . ']');
		if ( $db->affected_rows > 0 ) {
			$ts2 = substr($ts,0,8) ;
			$sql = "INSERT IGNORE INTO `daily` (`tablename`,`timestamp`,`cnt`) VALUES ('$table','$ts2',0)" ;
			if(!$result = $db->query($sql)) die('10b There was an error running the query [' . $db->error . '] '.$sql);
			$sql = "UPDATE `daily` SET cnt=cnt+1 WHERE `tablename`='$table' AND `timestamp`='$ts2'" ;
			if(!$result = $db->query($sql)) die('10c There was an error running the query [' . $db->error . '] '.$sql);
		}
	}
	inc_score ( $uid , $table ) ;

} else if ( $action == 'stats' ) {

	$sql = "SELECT count(*) as cnt from users" ;
	if(!$result = $db->query($sql)) die('20 There was an error running the query [' . $db->error . '] '.$sql);
	$x = $result->fetch_object() ;
	$out['players'] = $x->cnt ;

	$uid = getUserID($user) ;
	$sql = "SELECT * FROM scores WHERE user=$uid" ;
	if(!$result = $db->query($sql)) die('20 There was an error running the query [' . $db->error . '] '.$sql);
	$us = $result->fetch_object() ;
	foreach ( $tables AS $t => $mode ) {
		$out['data'][$mode] = array() ;
		$out['data'][$mode]['your_score'] = $us->$t ;

//		$sql = "SELECT count(*) AS cnt FROM $t WHERE status IS NULL" ;
		$sql = "SELECT TABLE_ROWS AS cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 's51999__merge_candidates' AND table_name='$t'" ;
		if(!$result = $db->query($sql)) die('20 There was an error running the query [' . $db->error . '] '.$sql);
		$x = $result->fetch_object() ;
		$out['data'][$mode]['todo'] = $x->cnt ;

		$sql = "SELECT sum($t) AS s FROM scores" ;
		if(!$result = $db->query($sql)) die('20 There was an error running the query [' . $db->error . '] '.$sql);
		$x = $result->fetch_object() ;
		$out['data'][$mode]['done_all'] = $x->s ;

		$out['data'][$mode]['top10'] = array() ;
		$sql = "SELECT * FROM scores,users WHERE users.id=scores.user ORDER BY $t DESC LIMIT 10" ;
		if(!$result = $db->query($sql)) die('20 There was an error running the query [' . $db->error . '] '.$sql);
		while ( $x = $result->fetch_object() ) {
			$out['data'][$mode]['top10'][] = array ( 'user' => $x->name , 'score' => $x->$t ) ;
		}
		
		$sql = "SELECT count(DISTINCT $t)+1 AS cnt FROM scores WHERE $t > " . $us->$t ;
		if(!$result = $db->query($sql)) die('20 There was an error running the query [' . $db->error . '] '.$sql);
		$x = $result->fetch_object() ;
		$out['data'][$mode]['rank'] = $x->cnt ;
	}

} else {
	require_once '/data/project/magnustools/public_html/php/Widar.php' ;
	$widar = new \Widar ( 'wikidata-game' ) ;
	$widar->attempt_verification_auto_forward ( '/' ) ;
	$widar->authorization_callback = 'https://wikidata-game.toolforge.org/api.php' ;
	if ( $widar->render_reponse(true) ) exit(0);

	$out['status'] = "Unknown action $action" ;
}

$out['elapsed'] = microtime(true) - $start_time ;
print json_encode ( $out ) ;

?>
