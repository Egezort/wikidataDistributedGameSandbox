<?PHP

//error_reporting(E_ERROR|E_CORE_ERROR|E_ALL|E_COMPILE_ERROR);
//ini_set('memory_limit','200M');
set_time_limit ( 30 ) ; // Seconds

require_once ( '../php/common.php' ) ;

$week = preg_replace ( '/^(\d\d\d\d)-(\d)$/' , '$1-0$2' , date ( 'Y-W' ) ) ;

function setGameStatus ( $id , $status ) {
	global $db ;
	$sql = "UPDATE games SET status='" . $db->real_escape_string($status) . "' WHERE id=$id" ;
	if(!$result = $db->query($sql)) die('There was an error running the query [' . $db->error . ']');
}

function curl_post($url, array $post = NULL, array $options = [])
{
    $defaults = [
        CURLOPT_POST => 1,
        CURLOPT_HEADER => 0,
        CURLOPT_URL => $url,
        CURLOPT_FRESH_CONNECT => 1,
        CURLOPT_RETURNTRANSFER => 1,
        CURLOPT_FORBID_REUSE => 1,
        CURLOPT_TIMEOUT => 4,
        CURLOPT_POSTFIELDS => http_build_query($post)
    ];

    $ch = curl_init();
    curl_setopt_array($ch, ($options + $defaults));
    if( ! $result = curl_exec($ch))
    {
        trigger_error(curl_error($ch));
    }
    curl_close($ch);
    return $result;
} 

function updateGame ( $id ) {
	global $db , $out ;
	$sql = "SELECT * FROM games WHERE id=$id" ;
	if(!$result = $db->query($sql)) die('There was an error running the query [' . $db->error . ']');
	$o = $result->fetch_object() ;
	if ( !$o ) return ; // No such game
	
	if ( $o->status == 'OFF' ) return ; // switched off manually
	
	$url = $o->api ;
	if ( preg_match('/\?/',$url) ) $url .= '&' ;
	else $url .= '?' ;
	$url .= "callback=xyz&action=desc" ;

	$r = trim ( file_get_contents ( $url ) ) ;
	$r = preg_replace ( '/^\/\*.*?\*\//' , '' , $r ) ;
	if ( !preg_match ( '/^xyz\s*\((.+)\s*\);{0,1}\s*$/' , $r , $m ) ) return setGameStatus ( $id , 'BAD_REPLY' ) ;
	$j = json_decode ( $m[1] ) ;
	
	if ( $j == null or !is_object($j) or !isset($j->label) or !isset($j->label->en) or !isset($j->description) or !isset($j->description->en) ) return setGameStatus ( $id , 'BAD_JSON' ) ;

	$sql = "UPDATE games SET status='OK',json='" . $db->real_escape_string(json_encode($j)) . "' WHERE id=$id" ;
	if(!$result = $db->query($sql)) die('There was an error running the query [' . $db->error . ']');
}

function parseWiki ( $wiki ) {
	$res = curl_post ( 'https://www.wikidata.org/w/api.php' , [ 'action' => 'parse' , 'text' => $wiki , 'contentmodel' => 'wikitext' , 'prop' => 'text' , 'disablelimitreport' => 1 , 'disabletoc' => 1 , 'mobileformat' => 1 , 'noimages' => 1 , 'format' => 'json' ] ) ;
	$res = json_decode ( $res ) ;
	$star = '*' ;
	return $res->parse->text->$star ;
}

function updateGameFile () {
	global $db ;
	$out = "{\n" ;
	$sql = "SELECT games.*,user.name AS owner FROM games,user WHERE user.id=games.user ORDER BY id DESC" ;
	if(!$result = $db->query($sql)) die('There was an error running the query [' . $db->error . ']');
	$first = true ;
	while($o = $result->fetch_object()){
		if ( $o->status != 'OK' ) continue ;
		if ( $first ) $first = false ;
		else $out .= ",\n" ;
		$j = json_decode ( $o->json ) ;
		$j->id = $o->id ;
		$j->api = $o->api ;
		$j->status = $o->status ;
		$j->owner = $o->owner ;
		if ( isset ( $j->description ) ) {
			foreach ( $j->description AS $lang => $wiki ) $j->description->$lang = parseWiki ( $wiki ) ;
		}
		if ( isset ( $j->instructions ) ) {
			foreach ( $j->instructions AS $lang => $wiki ) $j->instructions->$lang = parseWiki ( $wiki ) ;
		}
		$out .= '"'.$o->id.'":'.json_encode($j) ;
	}
	$out .= "\n}" ;

	$fp = fopen('games.json', 'w');
	fwrite ( $fp , $out ) ;
	fclose ( $fp ) ;
}

function getUserID ( $user ) {
	global $db ;
	$u2 = $db->real_escape_string ( trim ( str_replace ( '_' , ' ' , $user ) ) ) ;
	$sql = "SELECT * FROM user WHERE name='$u2'" ;
	if(!$result = $db->query($sql)) die('There was an error running the query [' . $db->error . ']');
	while($o = $result->fetch_object()) return $o->id ;
	$sql = "INSERT INTO user (name,settings) VALUES ('$u2','{\"languages\":[\"en\"]}')" ;
	if(!$result = $db->query($sql)) die('There was an error running the query [' . $db->error . ']');
	return $db->insert_id ;
}

header("Connection: close");
//header('Access-Control-Allow-Origin: *');
//header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Content-type: application/json');

$db = openToolDB ( 'distributed_game_p' ) ; // , 'p:tools-db' ) ; # p::tools-db for persistent connection

$out = [ 'status' => 'OK' , 'data' => [] ] ;

$action = get_request ( 'action' , '' ) ;

if ( $action == 'update_game' ) {

	$id = get_request ( 'id' , 0 ) * 1 ;
	updateGame ( $id ) ;
	updateGameFile() ;

} else if ( $action == 'update_all_games' ) {

	$ids = [] ;
	$sql = "SELECT id FROM games" ;
	if(!$result = $db->query($sql)) die('There was an error running the query [' . $db->error . ']');
	while($o = $result->fetch_object()) $ids[] = $o->id ;
	foreach ( $ids AS $id ) updateGame ( $id ) ;
	updateGameFile() ;

} else if ( $action == 'log_action' ) {

	$ts = date ( 'YmdHis' ) ;
	
	$user = get_request ( 'user' , '' ) ;
	$game = get_request ( 'game' , 0 ) * 1 ;
	$tile = $db->real_escape_string ( get_request ( 'tile' , '' ) ) ;
	$decision = $db->real_escape_string ( get_request ( 'decision' , '' ) ) ;
	$api_action = $db->real_escape_string ( get_request ( 'api_action' , '[]' ) ) ;
	
	$uid = getUserID ( $user ) ;
	
	if ( $game != 0 ) { // Ignore game testing
		$sql = "INSERT IGNORE INTO actions (user,game,tile,timestamp,week,decision,api_action) VALUES ($uid,$game,'$tile','$ts','$week','$decision','$api_action')" ;
		if(!$result = $db->query($sql)) die('There was an error running the query [' . $db->error . ']');
	}

} else if ( $action == 'rc' ) {

	$user = get_request ( 'user' , '' ) ;
	$max = get_request ( 'max' , 20 ) * 1 ;

	$sql = "SELECT *,actions.id AS aid,user.name AS user_name FROM user,games,actions WHERE actions.game=games.id AND user.id=actions.user AND games.status='OK'" ;
	if ( $user != '' ) $sql .= " AND user.name='" . $db->real_escape_string ( $user ) . "'" ;
	$sql .= " ORDER BY timestamp DESC" ;
	$sql .= " LIMIT $max" ;
	$out['sql'] = $sql ;
	
	$out['data'] = [] ;
	if(!$result = $db->query($sql)) die('There was an error running the query [' . $db->error . ']');
	while($o = $result->fetch_object()) {
		$out['data'][] = $o ;
	}
	
} else if ( $action == 'store_game' ) {

	$url = get_request ( 'api' , '' ) ;
	$user = get_request ( 'user' , '' ) ;
	if ( $url != '' and $user != '' ) {
		$uid = getUserID ( $user ) ;
		$sql = "INSERT INTO games (api,user,json) VALUES ('" . $db->real_escape_string ( $url ) . "','" . $db->real_escape_string ( $uid ) . "','')" ;
		if(!$result = $db->query($sql)) die('There was an error running the query [' . $db->error . ']');
		$out['id'] = $db->insert_id ;
		updateGame ( $out['id'] ) ;
		updateGameFile() ;
		$out['data'] = json_decode ( file_get_contents ( 'games.json' ) ) ;
	}

} else if ( $action == 'get_user_settings' ) {

	$user = get_request ( 'user' , '' ) ;
	$uid = getUserID ( $user ) ;
	$sql = "SELECT * FROM user WHERE id=$uid" ;
	if(!$result = $db->query($sql)) die('There was an error running the query [' . $db->error . ']');
	if($o = $result->fetch_object()) $out['user_settings'] = json_decode ( $o->settings ) ;

} else if ( $action == 'store_user_settings' ) {

	$settings = get_request ( 'settings' , '' ) ;
	$user = get_request ( 'user' , '' ) ;
	$uid = getUserID ( $user ) ;
	$sql = "UPDATE user SET settings='" . $db->real_escape_string($settings) . "' WHERE id=$uid" ;
	if(!$result = $db->query($sql)) die('There was an error running the query [' . $db->error . ']');
	$out['status'] = 'OK' ;

} else if ( $action == 'get_game_stats' ) {

	$max = 10 ;
	
	$good_games = [] ;
	$sql = "SELECT id FROM games WHERE status='OK'" ;
	if(!$result = $db->query($sql)) die('There was an error running the query [' . $db->error . ']');
	while($o = $result->fetch_object()) $good_games[] = $o->id ;
	$good_games = implode ( ',' , $good_games ) ;
	
	
	$users = [] ;
	$out['week'] = $week ;
	$out['weekly'] = [] ;
	$out['users'] = [] ;
	$sql = "select game,user,count(*) AS cnt FROM actions WHERE week='$week' GROUP BY game,user ORDER BY cnt DESC" ;
	if(!$result = $db->query($sql)) die('There was an error running the query [' . $db->error . ']');
	while($o = $result->fetch_object()) {
		if ( isset($out['weekly'][$o->game]) and count($out['weekly'][$o->game]) >= $max ) continue ;
		$out['weekly'][$o->game][] = [ 'user' => $o->user , 'cnt' => $o->cnt ] ;
		$users[$o->user] = $o->user ;
	}
	if ( count($users) > 0 ) {
		$sql = "SELECT * FROM user WHERE id IN (" . implode(',',$users) . ")" ;
		if(!$result = $db->query($sql)) die('There was an error running the query [' . $db->error . ']');
		while($o = $result->fetch_object()) {
			$out['users'][$o->id] = $o->name ;
		}
	}
	
	$out['hourly'] = [] ;
	$sql = "select game,substr(timestamp,1,10) as hour,count(*) AS cnt FROM actions WHERE week='$week' AND game IN ($good_games) group by hour,game order by game asc,hour asc" ;
	if(!$result = $db->query($sql)) die('There was an error running the query [' . $db->error . ']');
	while($o = $result->fetch_object()) {
		$out['hourly'][$o->game][$o->hour] = $o->cnt*1 ;
	}
	
	$out['decisions'] = [] ;
	$sql = "select game,decision,count(*) AS cnt from actions group by game,decision order by game" ;
	if(!$result = $db->query($sql)) die('There was an error running the query [' . $db->error . ']');
	while($o = $result->fetch_object()) {
		$d = $o->decision ;
		if ( $d != 'yes' and $d != 'no' ) $d = 'other' ;
		$out['decisions'][$o->game][$d] = $o->cnt ;
	}
	foreach ( array_keys ( $out['decisions'] ) AS $game ) {
		if ( !isset($out['decisions'][$game]['yes']) ) $out['decisions'][$game]['yes'] = 0 ;
		if ( !isset($out['decisions'][$game]['no']) ) $out['decisions'][$game]['no'] = 0 ;
		if ( !isset($out['decisions'][$game]['other']) ) $out['decisions'][$game]['other'] = 0 ;
	}
	
} else {
	require_once '/data/project/magnustools/public_html/php/Widar.php' ;
	$widar = new \Widar ( 'wikidata-game' ) ;
	$widar->attempt_verification_auto_forward ( '/distributed' ) ;
	$widar->authorization_callback = 'https://wikidata-game.toolforge.org/distributed/api.php' ;
	if ( $widar->render_reponse(true) ) exit(0);
}

print json_encode ( $out ) ;

?>
