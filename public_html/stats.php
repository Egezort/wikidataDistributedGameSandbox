<?PHP

error_reporting(E_ERROR|E_CORE_ERROR|E_ALL|E_COMPILE_ERROR);
ini_set('display_errors', 'On');
//ini_set('memory_limit','500M');
//set_time_limit ( 30000 ) ; // Seconds

require_once ( 'php/common.php' ) ;

$tables = array() ;

if ( 0 ) {
	$tables = array (
		'item_pairs' => 'merge' ,
	) ;
} else {
	// K=>V is table_name => mode_name
	$tables = array (
		'genderless_people' => 'nogender' ,
		'item_pairs' => 'merge' ,
		'potential_people' => 'person' ,
		'potential_nationality' => 'nationality' ,
		'people_no_date' => 'no_date' ,
		'no_image' => 'no_image' ,
		'potential_disambig' => 'disambig'
	) ;
}

$db = openToolDB ( 'merge_candidates' , 'p:tools-db' ) ;

print get_common_header ( '' , "Wikidata Game - Statistics" ) ;

print "<h2>Subgame status</h2>" ;
print "<table class='table-condensed table-striped'>" ;
print "<thead><tr><th>Status</th><th>#</th></tr>" ;
print "</thead><tbody>" ;
//$stati = array() ;
foreach ( $tables AS $table => $mode ) {
	$x = array() ;
	$sql = "select status,count(*) as cnt from $table group by status" ;
	if(!$result = $db->query($sql)) die('1 There was an error running the query [' . $db->error . ']');
	while($o = $result->fetch_object()) {
		$type = $o->status ;
		if ( !isset ( $type ) or $type == null ) $type = 'Still open' ;
		else if ( $type == 'DEL' or $type == 'LINK' or $type == 'DIS' ) $type = 'Resolved outside the game' ;
		else if ( $type == 'FLAG' ) $type = 'Flagged for error' ;
		else if ( $type == 'NOCANDIDATE' ) continue ;
		if ( isset ( $x[$type] ) ) $x[$type] += $o->cnt ;
		else $x[$type] = $o->cnt ;
	}
	print "<tr><td colspan='2'><h4>$mode</h4></td></tr>" ;
	foreach ( $x AS $type => $cnt ) {
		print "<tr><td>$type</td><td>$cnt</td></tr>" ;
	}
	myflush() ;
}

print "</tbody></table>" ;


myflush() ;


$by_day = array() ;
foreach ( $tables AS $table => $mode ) {
	$sql = "select * FROM daily WHERE `tablename`='$table'" ;
	if(!$result = $db->query($sql)) die('2 There was an error running the query [' . $db->error . ']');
	while($o = $result->fetch_object()) {
		$by_day[$o->timestamp][$mode] = $o->cnt ;
	}
}
ksort ( $by_day ) ;

print "<h2>Activity/day</h2>" ;
print "<table class='table-condensed table-striped'>" ;
print "<thead><tr><th>Date</th>" ;
foreach ( $tables AS $table => $mode ) print "<th>$mode</th>" ;
print "</thead><tbody>" ;
foreach ( $by_day AS $date => $data ) {
	print "<tr><th>" . substr($date,0,4)."-".substr($date,4,2)."-".substr($date,6,2) . "</th>" ;
	foreach ( $tables AS $table => $mode ) {
		if ( isset ( $data[$mode] ) ) print "<td style='font-family:courier;text-align:right'>" . $data[$mode] . "</td>" ;
		else print "<td style='text-align:center'></td>" ;
	}
	print "</tr>" ;
}
print "</tbody></table>" ;


print get_common_footer() ;

?>