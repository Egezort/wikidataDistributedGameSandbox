#!/usr/bin/php
<?PHP

error_reporting(E_ERROR|E_CORE_ERROR|E_ALL|E_COMPILE_ERROR);
ini_set('display_errors', 'On');

require_once ( '/data/project/wikidata-game/scripts/games/WikidataGameHelper.php' ) ;

$action = $argv[1]??'all' ;

$wgh = new WikidataGameHelper ;

if ( $action == 'no_image' ) $wgh->update_no_image() ;
else if ( $action == 'all' ) {
	$wgh->update_no_image() ;
}

$wgh->tfc->showProcInfo();

?>