<?PHP

ini_set('memory_limit','200M');
set_time_limit ( 30 ) ; // Seconds

require_once ( 'php/common.php' ) ;

$sites = array ( 'dewiki','enwiki','eowiki','eswiki','frwiki','itwiki','nlwiki' ) ;

$db = openToolDB ( 'merge_candidates' , 'p:tools-db' ) ;
$dbwd = openDB ( 'wikidata' , 'wikidata' ) ;

$site = $db->real_escape_string ( get_request ( 'site' , 'enwiki' ) ) ;
$size = 10 ;

preg_match ( '/^(.+?)(wik.+)$/' , $site , $site2 ) ;
$language = $site2[1] ;
$project = $site2[2] ;
if ( $project == 'wiki' ) $project = 'wikipedia' ;

print get_common_header ( '' , 'Articles without item' ) ;

print "<div class='lead'>
This tool lists random articles from a Wikipedia that have no item on Wikidata. It also uses Wikidata search to try and find possible existing items, but please be more thourough than this before creating a new item!<br/>
<i>Note:</i> The \"add to this item\" function requires <a href='/widar' target='_blank'>WiDaR</a> login to function.
</div>" ;

print "<form method='get' class='form form-inline inline-form'>" ;
foreach ( $sites AS $k => $s ) {
	if ( $k > 0 ) print " | " ;
	print "<label><input type='radio' name='site' value='$s'" ;
	if ( $s == $site ) print " checked" ;
	print "> $s</label>" ;
}
print " <input type='submit' value='Do it!' class='btn btn-primary' />" ;
print "</form>" ;

myflush() ;

$articles = array() ;
$r = rand() / getrandmax() ;
//$r = 0.320394 ; // TESTING
$sql = "SELECT * FROM potential_new_pages USE INDEX (site_2) WHERE status is null and site='$site' and random >= $r ORDER BY random LIMIT " . ($size*3) ;
if(!$result = $db->query($sql)) die('1 There was an error running the query [' . $db->error . '] '.$sql);
while($o = $result->fetch_object()) {
	$articles[$dbwd->real_escape_string($o->page)] = $o ;
}

//print "<pre>" ; print_r ( $articles ) ; print "</pre>" ; exit ( 0 ) ;

// Remove articles that already have an item
$sql = "SELECT * FROM wb_items_per_site WHERE ips_site_id='$site' AND ips_site_page IN ('" . implode("','",array_keys($articles)) . "')" ;
if(!$result = $dbwd->query($sql)) die('2 There was an error running the query [' . $dbwd->error . '] '.$sql);
while($o = $result->fetch_object()) {
	$title = $dbwd->real_escape_string ( $o->ips_site_page ) ;
	$sql = "UPDATE potential_new_pages SET status='DEL' WHERE status is null and id=" . $articles[$title]->id ;
	if(! $db->query($sql)) die('3 There was an error running the query [' . $db->error . '] '.$sql);
	unset ( $articles[$title] ) ;
}

// Remove articles that were deleted, renamed, or are redirects
$dbwp = openDBwiki ( $site ) ;
$wp = array() ;
foreach ( $articles AS $k => $v ) {
	$wp[str_replace(' ','_',$k)] = $k ;
}
$sql = "SELECT * FROM page WHERE page_namespace=0 and page_is_redirect=0 and page_title IN ('" . implode("','",array_keys($wp)) . "')" ;
if(!$result = $dbwp->query($sql)) die('4 There was an error running the query [' . $dbwp->error . '] '.$sql);
while($o = $result->fetch_object()) {
	$k = $wp[$o->page_title] ;
	$articles[$k]->exists = true ;
}
$nuke = array() ;
foreach ( $articles AS $k => $v ) {
	if ( !isset($v->exists) ) $nuke[] = $k ;
}
foreach ( $nuke AS $v ) {
	$sql = "UPDATE potential_new_pages SET status='DEL' WHERE status is null and id=" . $articles[$v]->id ;
	if(! $db->query($sql)) die('5 There was an error running the query [' . $db->error . '] '.$sql);
	unset ( $articles[$v] ) ;
}

// Re-size
while ( count($articles) > $size ) array_pop ( $articles ) ;

function wrapExtract ( $h , $col ) {
	return "<div style='border-left:10px solid $col;padding-left:10px;font-size:12pt'>$h</div>" ;
}

function getIntro ( $language , $project , $title , $col ) {
	$h = '' ;
	$url = "https://$language.$project.org/w/api.php?action=query&prop=extracts&exsentences=10&format=json&explaintext&titles=" . urlencode($title) ;
	$j = json_decode ( file_get_contents ( $url ) ) ;
	foreach ( $j->query->pages AS $v ) {
		$h .= $v->extract ;
	}
	return wrapExtract ( $h , $col ) ;
}

// Output
foreach ( $articles AS $a ) {
	print "<div class='well'>" ;
	print "<div><a style='font-weight:bold' target='_blank' href='//$language.$project.org/wiki/" . urlencode(str_replace(' ','_',$a->page)) . "'>" . $a->page . "</a>" ;
	print " | <a href='https://www.wikidata.org/w/index.php?search=" . urlencode($a->page) . "' target='_blank'>Search manually</a>" ;
	print " | <a href='https://www.google.co.uk/?#q=" . urlencode($a->page) . "++site%3Awikidata.org' target='_blank'>Search Google</a>" ;
	print " | <a href='https://www.wikidata.org/w/index.php?title=Special:NewItem&site=$site&page=" . urlencode($a->page) . "&label=" . urlencode(preg_replace('/\s*\(.*$/','',$a->page)) . "' target='_blank'>Create new item</a>" ;
	print "</div>" ;
	
	print getIntro ( $language , $project , $a->page , '#A8CFFF' ) ;

	$url = "https://www.wikidata.org/w/api.php?action=query&list=search&srnamespace=0&format=json&srsearch=" . urlencode($a->page) ;
	$j = json_decode ( file_get_contents ( $url ) ) ;
	$list = $j->query->search ;
	
	if ( count ( $list ) > 0 ) {
		while ( count($list) > 5 ) array_pop ( $list ) ;
		print "<ul>" ;
		foreach ( $list AS $l ) {
			print "<li><a href='//www.wikidata.org/wiki/" . $l->title . "' target='_blank'>" . $l->title . "</a>" ;
			print " [<a href='/widar/index.php?action=set_sitelink&q=".$l->title."&site=$site&title=".urlencode($a->page)."' target='_blank'><i>add to this item</i></a>]" ;
			print wrapExtract ( $l->snippet , '#8BFEA8' ) ;
			
			print "<ul>" ;
			$sql = "SELECT * FROM wb_items_per_site WHERE ips_item_id=" . preg_replace('/\D/','',$l->title) . " AND ips_site_id IN ('" . implode ( "','" , $sites ) . "')" ;
			if(!$result = $dbwd->query($sql)) die('9 There was an error running the query [' . $dbwd->error . '] '.$sql);
			while($o = $result->fetch_object()) {
				preg_match ( '/^(.+?)(wik.+)$/' , $o->ips_site_id , $site2 ) ;
				$l = $site2[1] ;
				$p = $site2[2] ;
				if ( $p == 'wiki' ) $p = 'wikipedia' ;
				print "<li>" ;
				print "<div><a href='//$l.$p.org/wiki/" . urlencode(str_replace(' ','_',$o->ips_site_page)) . "' target='_blank'>" . $o->ips_site_page . "</a> ($l.$p)</div>" ;
				$col = $o->ips_site_page==$site ? '#FF9797' : '#FFFF99' ;
				print getIntro ( $l , $p , $o->ips_site_page , $col ) ;
				print "</li>" ;
			}
			print "</ul>" ;
			
			print "</li>" ;
		}
		print "</ul>" ;
	} else {
		print "<div><i>No Wikidata search results for that title</i></div>" ;
	}
	
//	print "<pre>" ; print_r ( $j ) ; print "</pre>" ;

	print "</div>" ;
	myflush();
}


//print "<pre>" ; print_r ( $articles ) ; print "</pre>" ;

print get_common_footer() ;

?>