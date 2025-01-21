#!/usr/bin/php
<?PHP

error_reporting(E_ERROR|E_CORE_ERROR|E_ALL|E_COMPILE_ERROR);
ini_set('display_errors', 'On');
ini_set('memory_limit','3500M');
set_time_limit ( 60 * 60 ) ; // Seconds
require_once ( '../public_html/php/common.php' ) ;

$min_name_occurrence = 10 ; // Min occurrences in existing people
$max = 0 ; // 0=deactivate

function extractName ( $name ) {
	$name = preg_replace ( '/^(death[ _]of[ _]|lord[ _])/i' , '' , $name ) ;
	$name = str_replace ( '_' , ' ' , $name ) ;
	if ( preg_match ( '/\b(saint|[au]nd|Mrs\.|Lady|discography)\b/' , $name ) ) return '' ;
	if ( preg_match ( '/^\d/' , $name ) ) return '' ;
	$name = explode ( ' ' , $name  ) ;
	while ( count($name) > 1 ) {
		if ( preg_match ( '/\.$/' , $name[0] ) ) array_shift ( $name ) ;
		else break ;
	}
	if ( count ( $name ) < 2 ) return '' ;
	return $name[0] ;
}

$db = openDB ( 'wikidata' , 'wikidata' ) ;
$dbu = openToolDB ( 'merge_candidates' ) ;

print "Getting existing potentials...\n" ;
$hadthat = array () ;
$sql = "SELECT item FROM potential_people" ;
if(!$result = $dbu->query($sql)) die('1 There was an error running the query [' . $db->error . ']'.$sql);
while($o = $result->fetch_object()){
	$hadthat[$o->item] = true ;
}

print "Getting all people...\n" ;
$j = json_decode ( file_get_contents ( "$wdq_internal_url?q=claim[31:5]" ) ) ;
if ( !isset ( $j->items ) or count ( $j->items ) == 0 ) exit ( 0 ) ; // Paranoia

print "Getting their names...\n" ;

$valid_name = array() ;
while ( count ( $j->items ) > 0 ) {
	$i2 = array() ;
	while ( count($j->items) > 0 and count($i2) < 10000 ) $i2[] = array_pop ( $j->items ) ;
	$sql = "select term_text FROM wb_terms where term_type='label' and term_entity_type='item' and term_entity_id in (" . join(',',$i2) . ")" ;
	if ( $max > 0 ) $sql .= " LIMIT $max" ;
	if(!$result = $db->query($sql)) die('2 There was an error running the query [' . $db->error . ']'.$sql);
	while($o = $result->fetch_object()){
		$name = extractName ( $o->term_text ) ;
		if ( $name == '' ) continue ;
		if ( isset($valid_name[$name]) ) $valid_name[$name]++ ;
		else $valid_name[$name] = 1 ;
	}
}

print "Checking new names...\n" ;
$to_add = array() ;
$sql = "select term_entity_id,term_text from wb_entity_per_page,wb_terms WHERE epp_entity_id=term_entity_id and term_entity_type='item' and term_type IN ('label','alias') and not exists (select * from pagelinks,linktarget where pl_target_id=lt_id AND pl_from=epp_page_id and lt_namespace=120 and lt_title='P31')" ;
if ( $max > 0 ) $sql .= " LIMIT $max" ;
if(!$result = $db->query($sql)) die('3 There was an error running the query [' . $db->error . ']'.$sql);
while($o = $result->fetch_object()){
	if ( isset ( $hadthat[$o->term_entity_id] ) ) continue ;
	$name = extractName ( $o->term_text ) ;
	if ( $name == '' ) continue ;
	if ( !isset($valid_name[$name]) ) continue ;
	if ( $valid_name[$name] < $min_name_occurrence ) continue ;
	$hadthat[$o->term_entity_id] = true ;
	$to_add[] = $o->term_entity_id ;
}

$dbu = openToolDB ( 'merge_candidates' ) ;
print "Updating DB ( " . count ( $to_add ) . " items)...\n" ;
//$fp = fopen('/data/project/wikidata-game/tools/potential_people.sql', 'w'); // This is for debugging; no need to write this to file once it works
while ( count ( $to_add ) > 0 ) {
	$a = array() ;
	while ( count ( $to_add ) > 0 and count ( $a ) < 1000 ) $a[] = array_pop ( $to_add ) ;
	$sql = "INSERT IGNORE INTO potential_people ( item ) VALUES (" . implode ( '),(' , $a ) . ")" ;
//	fwrite($fp, "$sql;\n");
	if(!$result = $dbu->query($sql)) {} //die('4There was an error running the query [' . $db->error . ']'.$sql."\n");
	
}
//fclose($fp);

$sql = "UPDATE potential_people SET random=rand() WHERE random IS NULL" ;
if(!$result = $dbu->query($sql)) die('There was an error running the query [' . $db->error . '] '.$sql);


?>