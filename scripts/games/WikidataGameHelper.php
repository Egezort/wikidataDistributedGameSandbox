<?PHP

require_once ( '/data/project/wikidata-game/public_html/php/ToolforgeCommon.php' ) ;


class WikidataGameHelper {
	public $db , $dbwd , $dbco ;
	public $tfc ;

	function __construct($tfc=null) {
		if ( isset($tfc) ) $this->tfc = $tfc ;
		else $this->tfc = new ToolforgeCommon() ;
		$this->db = $this->tfc->openDBtool ( 'merge_candidates' ) ;
		$this->dbwd = $this->tfc->openDBwiki ( 'wikidatawiki' ) ;
		$this->dbco = $this->tfc->openDBwiki ( 'commonswiki' ) ;
	}

	# $q2ids MUST BE 'Qxxx' => id_in_table
	function update_status_and_unset ( $table , &$chunk , $q2ids , $new_status ) {
		if ( count($q2ids)==0 ) return ;
		$sql = "UPDATE `{$table}` SET `status`='{$new_status}' WHERE `status` IS NULL AND `id` IN (" . implode(",",$q2ids) . ")" ;
		$this->tfc->getSQL ( $this->db , $sql ) ;
		foreach ( array_keys($q2ids) AS $q ) unset($chunk[$q]) ;
	}

	function update_no_image_generator($batch_size=5000) {
		$items = [] ;
		$sql = "SELECT * FROM `no_image` WHERE `status` IS NULL" ;
		$result = $this->tfc->getSQL ( $this->db , $sql ) ;
		while($o = $result->fetch_object()) {
			$items["Q{$o->item}"] = $o->id ;
			if ( count($items) < $batch_size ) continue ;
			yield $items ;
			$items = [] ;
		}
		if ( count($items)>0 ) yield $items ;
		else yield from [] ;
	}

	function update_no_image () {
		foreach ( $this->update_no_image_generator() AS $chunk ) {
			# Deleted or redirected
			if ( count($chunk) == 0 ) continue ;
			$qs = array_merge([],$chunk) ;
			$redirect_ids = [] ;
			$sql = "SELECT `page_title`,`page_is_redirect` FROM `page` WHERE `page_namespace`=0 AND `page_title` IN ('".implode("','",array_keys($qs))."')" ;
			$result = $this->tfc->getSQL ( $this->dbwd , $sql ) ;
			while($o = $result->fetch_object()) {
				if ( $o->page_is_redirect ) $redirect_ids[$o->page_title] = $chunk[$o->page_title] ;
				unset ( $qs[$o->page_title] ) ;
			}
			$this->update_status_and_unset ( 'no_image' , $chunk , $qs , 'DEL' ) ;
			$this->update_status_and_unset ( 'no_image' , $chunk , $redirect_ids , 'REDIR' ) ;

			# Has an image
			if ( count($chunk) == 0 ) continue ;
			$sql = "SELECT DISTINCT `page_title` FROM `page`,`pagelinks`,`linktarget` WHERE `pl_target_id`=`lt_id` AND `page_namespace`=0 AND `page_id`=`pl_from` AND `lt_namespace`=120 AND `lt_title`='P18' AND `page_title` IN ('".implode("','",array_keys($chunk))."')" ;
			$result = $this->tfc->getSQL ( $this->dbwd , $sql ) ;
			$to_update = [] ;
			while($o = $result->fetch_object()) $to_update[$o->page_title] = $chunk[$o->page_title] ;
			$this->update_status_and_unset ( 'no_image' , $chunk , $to_update , 'DONE' ) ;
		}
	}
}

?>