<?PHP

require_once ( './game1.inc' ) ;
require_once ( '../../php/wikidata.php' ) ;

header('Content-type: application/json');

$callback = get_request ( 'callback' , '' ) ;
$action = get_request ( 'action' , '' ) ;

$out = array () ;

if ( $action == 'desc' ) {

	$out = array (
		"label" => array ( "en" => "Primary sources" ) ,
		"description" => array ( "en" => "Check if a third-party site is a source for a statement." ) ,
		"instructions" => array ( "en" => "*Please make sure the web site really contains a source for the statement in question\n*If a new statement is added, please make sure it is correct in the source!" ) ,
		"icon" => 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Balakhany_oil.jpg/120px-Balakhany_oil.jpg' ,
		'options' => array (
			array ( 'name' => 'Mode' , 'key' => 'mode' , 'values' => array ( 'any' => 'Any' , 'existing' => 'Just sources for existing statements' , 'new' => 'Just new statements' ) )
		)
	) ;

} else if ( $action == 'tiles' ) {

	$wil = new WikidataItemList ;
	$dbwd = openDB ( 'wikidata' , 'wikidata' ) ;

	$out['tiles'] = array() ;
	$num = get_request('num',1)*1 ; // Number of games to return
	$lang = get_request ( 'lang' , 'en' ) ;
	$mode = get_request ( 'mode' , 'any' ) ;
	
	while ( count($out['tiles']) < $num ) {
		$url = 'https://tools.wmflabs.org:443/wikidata-primary-sources/statements/any' ;
		$j = json_decode ( file_get_contents ( $url ) ) ;

		$to_load = array() ;
		foreach ( $j AS $part ) {
			if ( $part->state != 'unapproved' ) continue ;
			$s = explode ( '	' , $part->statement ) ;
			if ( !preg_match ( '/^Q\d+$/' , $s[2] ) ) continue ; // No dates etc. yet
			$to_load[] = $s[0] ;
			$to_load[] = $s[1] ;
			$to_load[] = $s[2] ;
		}
		$wil->loadItems ( $to_load ) ;

		foreach ( $j AS $part ) {
			if ( $part->state != 'unapproved' ) continue ;
			$s = explode ( '	' , $part->statement ) ;
			if ( count($s) != 5 ) continue ;
			$q = $s[0] ;
			$prop = $s[1] ;
			$q_target = $s[2] ;
			$s_prop = preg_replace ( '/^S/' , 'P' , $s[3] ) ;
			if ( $s_prop != 'P854' ) continue ;
			$url = preg_replace ( '/^"(.+)"$/' , '\1' , $s[4] ) ;
			if ( !preg_match ( '/^Q\d+$/' , $q_target ) ) continue ; // No dates etc. yet

			if ( isDeleted ( $dbwd , $q ) ) continue ;

			$tile = (object) array (
				'id' => $part->id ,
				'sections' => array () ,
				'controls' => array ()
			) ;
			
			if ( !$wil->hasItem($q) ) continue ;
			$i = $wil->getItem($q) ;
			if ( !$i->hasClaims($prop) ) continue ;
			$claims = $i->getClaims($prop) ;
			$snak_id = '' ;
			$numid = 'numeric-id' ;

//			print_r ( $part ) ;			print "$q\n$prop\n$q_target\n\n" ;			print_r ( $claims ) ; exit ( 0 ) ;

			foreach ( $claims AS $c ) {
				if ( !isset($c->mainsnak) ) continue ;
				if ( !isset($c->mainsnak->datavalue) ) continue ;
				if ( !isset($c->mainsnak->datavalue->value) ) continue ;
				if ( !isset($c->mainsnak->datavalue->value->$numid) ) continue ;
				if ( 'Q'.$c->mainsnak->datavalue->value->$numid != $q_target ) continue ;
				$snak_id = $c->id ;
				break ;
			}

			$action = array() ;
			
			$ref_snak = array (
				'snaks' => array (
					$s_prop => array (
						array (
							'snaktype' => 'value' ,
							'property' => $s_prop ,
							'datatype' => 'url' ,
							'datavalue' => array (
								'value' => $url ,
								'type' => 'string'
							)
						)
					)
				)
			) ;
			
			if ( $snak_id == '' && $mode == 'existing' ) continue;
			if ( $snak_id != '' && $mode == 'new' ) continue;
			
			if ( $snak_id == '' ) {
				$guid = $q . '$' . sprintf(
					'%04X%04X-%04X-%04X-%04X-%04X%04X%04X',
					mt_rand( 0, 65535 ),
					mt_rand( 0, 65535 ),
					mt_rand( 0, 65535 ),
					mt_rand( 16384, 20479 ),
					mt_rand( 32768, 49151 ),
					mt_rand( 0, 65535 ),
					mt_rand( 0, 65535 ),
					mt_rand( 0, 65535 )
				);
		
				$statement = array (
					'id' => $guid ,
					'type' => 'statement' ,
					'mainsnak' => array (
						'snaktype' => 'value' ,
						'property' => $prop ,
						'datatype' => 'wikibase-item' ,
						'datavalue' => array (
							'value' => array ( 'entity-type' => 'item' , 'numeric-id' => preg_replace ( '/\D/' , '' , $q_target ) ) ,
							'type' => 'wikibase-entityid'
						)
					) ,
					'references' => array ( $ref_snak ) ,
					'rank' => 'normal'
				) ;
				$action = array ( 'action'=>'wbsetclaim','claim' => json_encode ( $statement ) ) ;
			} else {
				$action = array ( 'action'=>'wbsetreference','statement'=>$snak_id , 'snaks' => json_encode($ref_snak['snaks']) ) ;
			}
			
			$l1 = $wil->getItem($s[1])->getLabel($lang) ;
			$l2 = $wil->getItem($s[2])->getLabel($lang) ;
			$text = "$l1: $l2" ;
			if ( $snak_id == '' ) {
				if ( $i->hasClaims($prop) ) $text .= "\nNOTE: This item already has statements about $l1." ;
				$text .= "\nThis will add a new statement and source to the item!" ;
			} else $text .= "\nThis will add a new source to the statement." ;
			
//			$tile->url = $url ;			$tile->s = $s ;			$tile->tmp = $part ;

			$tile->sections[] = array ( 'type' => 'item' , 'q' => $s[0] ) ;
			$tile->sections[] = array ( 'type' => 'text' , 'text' => $text , 'title' => $url , 'url' => $url ) ;
			$tile->controls[] = array (
				'type' => 'buttons' ,
				'entries' => array (
					array ( 'type' => 'green' , 'decision' => 'yes' , 'label' => 'Source' , 'api_action' => array ( $action ) ) ,
//					array ( 'type' => 'green' , 'decision' => 'yes' , 'label' => 'Source' , 'api_action' => array ('action'=>'wbmergeitems','fromid'=>$q2,'toid'=>$q1,'ignoreconflicts'=>'label|description' ) ) ,
					array ( 'type' => 'white' , 'decision' => 'skip' , 'label' => 'Skip' ) ,
					array ( 'type' => 'blue' , 'decision' => 'no' , 'label' => 'Not a source' )
				)
			) ;
			
			$out['tiles'][] = $tile ;
		}
	}


} else if ( $action == 'log_action' ) {


function curl_post($url, array $post = NULL, array $options = array())
	{
		$defaults = array(
			CURLOPT_POST => 1,
			CURLOPT_HEADER => 0,
			CURLOPT_URL => $url,
			CURLOPT_FRESH_CONNECT => 1,
			CURLOPT_RETURNTRANSFER => 1,
			CURLOPT_FORBID_REUSE => 1,
			CURLOPT_TIMEOUT => 4,
			CURLOPT_USERAGENT => $_SERVER['HTTP_USER_AGENT'] ,
			CURLOPT_POSTFIELDS => http_build_query($post)
		);

		$ch = curl_init();
		curl_setopt_array($ch, ($options + $defaults));
		if( ! $result = curl_exec($ch))
		{
//			print curl_error($ch) . "\n\n" ; exit ( 0 ) ;
//			trigger_error(curl_error($ch));
		}
		$httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
		curl_close($ch);
		return $httpcode ;
	} 

	$user = get_request ( 'user' , '' ) ;
	$tile = get_request ( 'tile' , 0 ) * 1 ;
	$decision = get_request ( 'decision' , '' ) ;
	
	$state = $decision == 'yes' ? 'approved' : 'unapproved' ;
	
	$url = 'https://tools.wmflabs.org:443/wikidata-primary-sources/statements/'.$tile ;
	$url .= '?state=' . $state . '&user=' . urlencode($user) ;
	$out['http_code'] = curl_post ( $url , array() ) ;


} else {
	$out['error'] = "No valid action!" ;
}


print $callback . '(' ;
print json_encode ( $out ) ;
print ")\n" ;

?>
