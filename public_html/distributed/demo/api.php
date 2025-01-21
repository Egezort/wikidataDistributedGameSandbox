<?PHP

error_reporting(E_ERROR|E_CORE_ERROR|E_ALL|E_COMPILE_ERROR);
ini_set('display_errors', 'On');

header('Content-type: application/json');

$callback = $_REQUEST['callback'] ;
$out = array () ;


if ( $_REQUEST['action'] == 'desc' ) {

	$out = array (
		"label" => array ( "en" => "Test game 1" ) ,
		"description" => array ( "en" => "This is a test. There are many others like it, but this one is mine. This game will show a random item, and offer to add it to the Sandbox item as a source." ) ,
		"icon" => 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Inkscape_vectorisation_test.svg/120px-Inkscape_vectorisation_test.svg.png'
	) ;

} else if ( $_REQUEST['action'] == 'tiles' ) {

	// GET parameters
	$num = $_REQUEST['num'] ; // Number of games to return
	$lang = $_REQUEST['lang'] ; // The language to use, with 'en' as fallback; ignored in this game
	$q_sandbox = 'Q4115189' ;

	$out['tiles'] = array() ;	
	for ( $n = 1 ; $n <= $num ; $n++ ) {
	
		$q = rand(1,21000000) ; // Random item
	
		$g = array(
			'id' => rand() ,
			'sections' => array () ,
			'controls' => array ()
		) ;
		
		$g['sections'][] = array ( 'type' => 'item' , 'q' => 'Q'.$q ) ;
		$g['controls'][] = array (
			'type' => 'buttons' ,
			'entries' => array (
				array ( 'type' => 'green' , 'decision' => 'yes' , 'label' => 'Is source' , 'api_action' => array ('action'=>'wbcreateclaim','entity'=>$q_sandbox,'property'=>'P1343','snaktype'=>'value','value'=>'{"entity-type":"item","numeric-id":'.$q.'}' ) ) ,
				array ( 'type' => 'white' , 'decision' => 'skip' , 'label' => 'Dunno' ) ,
				array ( 'type' => 'blue' , 'decision' => 'no' , 'label' => 'Nope' )
			)
		) ;
		
		$out['tiles'][] = $g ;
	}
	
} else if ( $_REQUEST['action'] == 'log_action' ) {

	$out['status'] = 'Whatevaz, man' ;

} else {
	$out['error'] = "No valid action!" ;
}

print $callback . '(' ;
print json_encode ( $out ) ;
print ")\n" ;

?>
