<?PHP

set_time_limit ( 60 * 10 ) ; // Seconds
require_once ( 'php/common.php' ) ;
//error_reporting(E_ERROR|E_CORE_ERROR|E_ALL|E_COMPILE_ERROR);
//ini_set('display_errors', 'On');

print get_common_header ( '' , 'Game list' ) ;

$db = openToolDB ( 'merge_candidates' , 'p:tools-db' ) ;
$dbwd = openDB ( 'wikidata' , 'wikidata' ) ;

$letter = $db->real_escape_string ( get_request ( 'letter' , '' ) ) ;

print "<div><b>Start letter</b>: <a href='?'>All</a>" ;
for ( $a = "A" ; $a <= "Z" ; $a = chr ( ord ( $a ) + 1 ) ) {
	if ( $letter == $a ) print " | <b>$a</b>" ;
	else print " | <a href='?letter=$a'>$a</a>" ;
}
print "</div>" ;


$sql = "SELECT * FROM item_pairs WHERE status IS NULL" ;
if ( $letter != '' ) $sql .= " AND label LIKE \"$letter%\"" ;
//print "<pre>$sql</pre>" ;

if(!$result = $db->query($sql)) die('There was an error running the query [' . $db->error . ']');

print "<h2>Merge candidates</h2>" ;
print "<table class='table table-condensed table-striped'>" ;
print "<thead><tr><th>#</th><th>Item 1 [lang]</th><th>Item 2 [lang]</th><th>Shared<br/>langlinks</th><th>Shared label</th></tr></thead>" ; // <th>Note</th>
print "<tbody>" ;

$cnt = 0 ;
while($o = $result->fetch_object()){

	$sql = "SELECT count(*) as cnt FROM page WHERE page_namespace=0 AND page_title IN ('Q".$o->item1."','Q".$o->item2."')" ;
	if(!$result2 = $dbwd->query($sql)) die('There was an error running the query [' . $db->error . ']');
	$o2 = $result2->fetch_object() ;
	if ( $o2->cnt != 2 ) {
		$sql = "UPDATE item_pairs SET status='DEL' WHERE id=" . $o->id ;
		if(!$result2 = $db->query($sql)) die('There was an error running the query [' . $db->error . ']');
		continue ;
	}
	
	$i1 = $o->item1 ;
	$i2 = $o->item2 ;
	
	$lang = array() ;
	$lang[$i1] = 0 ;
	$lang[$i2] = 0 ;
	
	$sql = "select ips_item_id,count(*) AS cnt from wb_items_per_site where ips_item_id IN ($i1,$i2) group by ips_item_id" ;
	if(!$result2 = $dbwd->query($sql)) die('There was an error running the query [' . $db->error . ']');
	while ( $o2 = $result2->fetch_object() ) {
		$lang[$o2->ips_item_id] = $o2->cnt ;
	}
	
	$shared_lang = 0 ;
	$sql = "select ips_site_id,count(*) AS cnt FROM wb_items_per_site where ips_item_id IN ($i1,$i2) GROUP BY ips_site_id HAVING cnt>1" ;
	if(!$result2 = $dbwd->query($sql)) die('There was an error running the query [' . $db->error . ']');
	while ( $o2 = $result2->fetch_object() ) {
		$shared_lang++ ;
	}

	$cnt++ ;
	print "<tr>" ;
	print "<td style='text-align:right'>$cnt</td>" ;
	print "<td nowrap><a href='//www.wikidata.org/wiki/Q$i1' target='_blank'>Q$i1</a> [" . $lang[$i1] . "]</td>" ;
	print "<td nowrap><a href='//www.wikidata.org/wiki/Q$i2' target='_blank'>Q$i2</a> [" . $lang[$i2] . "]</td>" ;
	print "<td>" . ($shared_lang==0?'':$shared_lang) . "</td>" ;
	print "<td style='font-size:9pt'>" . $o->label . "</td>" ;
		
	
	
//	print "<td>" . join ( "; " , $note ) . "</td>" ;
	
	print "</tr>" ;
}
print "</tbody></table>" ;

print get_common_footer() ;

?>