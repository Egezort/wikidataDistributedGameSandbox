#!/usr/bin/php
<?PHP

error_reporting(E_ERROR|E_CORE_ERROR|E_ALL|E_COMPILE_ERROR);
ini_set('display_errors', 'On');
require_once ( '../public_html/php/common.php' ) ;

$min_label_length = 4 ;
$max_num_dupes = 5 ;

$db = openDB ( 'wikidata' , 'wikidata' ) ;
$dbu = openToolDB ( 'merge_candidates' ) ;
$wp_types = "'Q4167410','Q4167836','Q11266439','Q13406463','Q17362920','Q17633526'" ;

$f = fopen( 'php://stdin', 'r' );
$line = fgets( $f ) ; // Header
while( $line = fgets( $f ) ) {
	list ( $label , $all_items ) = explode ( "\t" , $line ) ;
	if ( strlen ( $label ) < $min_label_length or $label == 'null' ) continue ;
	if ( preg_match ( '/^.{0,1}\d+$/' , $label ) ) continue ; // Number-ish
	$all_items = explode ( '|' , trim($all_items) ) ;
	
	while ( count($all_items) > 0 and trim($all_items[count($all_items)-1]) == '' ) array_pop ( $all_items ) ;
	
	if ( count ( $all_items ) == 0 ) continue ;
	
	$sql = "SELECT DISTINCT REPLACE(page_title, 'Q', '') AS entity_id FROM page,pagelinks,linktarget WHERE pl_target_id=lt_id AND page_title IN ('" . implode("','Q",$all_items) . "')" ;
	$sql .= " AND page_namespace = 0 AND page_id=pl_from AND lt_namespace=0 AND lt_title IN ($wp_types)" ;
//	print "$sql\n" ;
	if(!$result = $db->query($sql)) die('#1: There was an error running the query [' . $db->error . ']'."\n$sql\n\n");
	$bad = array() ;
	while($o = $result->fetch_object()){
		$bad[$o->entity_id] = 1 ;
	}

	$items = array() ;
	foreach ( $all_items AS $v ) {
		if ( !isset($bad[$v]) ) $items[] = $v ;
	}
	
	sort ( $items , SORT_NUMERIC ) ; // item1 should always be < item2
	$max = count($items) ;
	
//	print "$label\t" . implode("\t",$items) . "\n" ;
//	continue ;

	if ( $max < 2 or $max > $max_num_dupes ) continue ;
	
	foreach ( $items AS $k1 => $v1 ) {
		for ( $k2 = $k1+1 ; $k2 < $max ; $k2++ ) {
			$v2 = $items[$k2] ;
			
			// Check for site conflict
			$fail = false ;
			$sql = "SELECT ips_site_id,count(*) AS cnt FROM wb_items_per_site WHERE ips_item_id IN ($v1,$v2) GROUP BY ips_site_id HAVING cnt>1" ;
			if(!$r2 = $db->query($sql)) die('There was an error running the query [' . $db->error . ']');
			while($o = $r2->fetch_object()){$fail=true;}
			if ( $fail ) continue ;
			
			$sql = "INSERT IGNORE INTO item_pairs (item1,item2,label) VALUES ($v1,$v2,'$label')" ;
			$dbu->query($sql) ;
//			print "$v1/$v2\n" ;
		}
	}
}

fclose( $f );

$sql = "UPDATE item_pairs SET random=rand() WHERE random IS NULL" ;
if(!$result = $dbu->query($sql)) die('There was an error running the query [' . $db->error . '] '.$sql);

?>