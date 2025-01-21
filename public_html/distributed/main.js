var wikidata_distributed_game = {

	thumbsize : 240 ,
	precache_games_lower : 5 ,
	precache_games_upper : 10 ,

	fallback_lang : 'en' ,
	running : 0 ,
	games : {} ,
	serial : 0 ,
	vertical : false ,
	widar : {} ,
	wd : {} ,
	autodesc_cache : {} ,
	shortcuts : {} ,
	user_settings : { languages:['en'] } ,

	file_props : {
		Images : {
	//		Image:18,
			Signature:109,
			'Coat of arms':94,
			Logo:154,
			Flag:41,
			Seal:158,
			'Range map':181,
			'Locator map':242,
			'Grave image':1442,
			'Commemorative plaque':1801
		} ,
		Media : {
			Video:10,
			Audio:51,
			Pronounciation:443,
			Voice:990
		}
	} ,

	init : function () {
		var me = this ;
		me.lang = me.fallback_lang ;
		
		me.wd = new WikiData ;

		$('#stats_icon a').click ( me.showStats ) ;
		
		me.vertical = (window.innerHeight > window.innerWidth) ;
		$('a.navbar-brand').click ( function () {
			me.showGames() ;
			return false ;
		} ) ;
		
		$(window).keypress ( me.onKeyPress ) ;


		function fin () {
			if ( me.isRunning(-1) ) return ;

			var h = '' ;
			if ( me.widar.isLoggedIn() ) {
				h = me.widar.getUserName() ;
				$('#user_icon').show() ;
				$('#user_icon a').click ( me.showUserSettings ) ;
			} else {
				h = me.widar.getLoginLink('Log in') ;
			}
			$('#widar').html(h).show() ;

			var v = me.getUrlVars() ;
			me.original_params = v ;
			if ( typeof v.mode == 'undefined' && typeof v.game == 'undefined' ) me.showGames() ; // No need to wait for user data to load

			function fin2 () {
				if ( typeof v.mode == 'undefined' && typeof v.game == 'undefined' ) return ; // Had that
				
				if ( v.mode == 'settings' ) me.showUserSettings() ;
				else if ( v.mode == 'add_game' ) me.addNewGame() ;
				else if ( v.mode == 'stats' ) me.showStats() ;
				else if ( v.mode == 'test_game' ) me.testGame(decodeURIComponent(v.url)) ;
				else if ( typeof v.game != 'undefined' ) {
					var opt ;
					if ( typeof v.opt != 'undefined' ) opt = JSON.parse ( decodeURIComponent ( v.opt ) ) ;
					me.startGame ( v.game*1 , opt ) ;
				}
				else me.showGames() ;
			}
			
			
			if ( me.widar.isLoggedIn() ) {
				$.get ( './api.php' , {
					action:'get_user_settings',
					user:me.widar.getUserName()
				} , function ( d ) {
					me.user_settings = d.user_settings ;
				} ) . always ( fin2 ) ;
			} else {
				me.user_settings = { languages:['en'] } ;
				fin2() ;
			}
		}

		me.isRunning(1);
		me.widar = new WiDaR ( fin , '/distributed/api.php' ) ;
		me.widar.tool_hashtag = 'distributed-game' ;
		me.loadGames ( fin ) ;
	} ,
	
	onKeyPress : function ( e ) {
		if ( typeof e.key == 'undefined' ) e.key = String.fromCharCode ( e.charCode ? e.charCode : e.keyCode ? e.keyCode : 0 ) ;
		var me = wikidata_distributed_game ;
		if ( typeof me.current_game == 'undefined' ) return ;
		if ( typeof me.current_game.cache == 'undefined' ) return ;
		if ( me.current_game.cache.length == 0 ) return ;
		var game_id = me.current_game.id ;
		var tile_id = me.current_game.cache[0].id ;
		if ( typeof me.shortcuts[game_id] == 'undefined' ) return ;
		if ( typeof me.shortcuts[game_id][tile_id] == 'undefined' ) return ;
		if ( typeof me.shortcuts[game_id][tile_id][e.key] == 'undefined' ) return ;
//		console.log ( game_id , tile_id , e.key , me.shortcuts[game_id][tile_id][e.key] ) ;
		$('#'+me.shortcuts[game_id][tile_id][e.key]).click() ;
	} ,
	
	isRunning : function ( diff ) {
		var me = this ;
		if ( typeof diff != 'undefined' ) {
			me.running += diff ;
			if ( me.running > 0 ) $('#spinning').show() ;
			else $('#spinning').hide() ;
		}
		return me.running > 0 ;
	} ,

	getUrlVars : function () {
		var vars = {} ;
		var hashes = window.location.href.slice(window.location.href.indexOf('#') + 1).split('&');
		$.each ( hashes , function ( i , j ) {
			var hash = j.split('=');
			hash[1] += '' ;
			vars[hash[0]] = decodeURI(hash[1]);
		} ) ;
//		console.log ( vars ) ;
		return vars;
	} ,

	escapeAttribute : function ( s ) {
		if ( typeof s == 'undefined' ) s = '' ;
		return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;').replace(/\//g,'&#x2F;') ;
	} ,
	
	getMainLang : function () {
		var me = this ;
		if ( typeof me.user_settings != 'undefined' ) return me.user_settings.languages[0] ;
		return me.lang ;
	} ,
	
	t : function ( o ) {
		var me = this ;
		if ( typeof o == 'undefined' ) return 'No object passed' ;
		if ( typeof o[me.getMainLang()] != 'undefined' ) return o[me.getMainLang()] ;
		if ( typeof o[me.fallback_lang] != 'undefined' ) return o[me.fallback_lang] ;
		return "<i>No suitable translation found</i>" ;
	} ,
	
	toText : function ( s ) {
		var tmp = document.createElement("DIV");
		tmp.innerHTML = s;
		var ret = tmp.textContent || tmp.innerText || "";
		ret = ret.replace ( /\n/g , '<br/>' ) ;
		return ret ;
	} ,
	
	toHtml : function ( s ) {
		return $('<div>').append($.parseHTML(s)).html();
	} ,
	
	prepGames : function () {
		var me = this ;
		$.each ( me.games , function ( k , v ) {
			me.games[k].cache = [] ;
		} ) ;
	} ,
	
	loadGames : function ( callback ) {
		var me = this ;
		me.isRunning(1);
		$.get ( './games.json' , function ( d ) {
			me.games = d ;
			me.prepGames() ;
			callback() ;
		} , 'json' ) ;
	} ,
	
	renderGameEntry : function ( g ) {
		var me = this ;
		var h = '' ;
		h += "<div class='row game_entry' gameid='"+g.id+"'>" ;
		h += "<div class='col-xs-4 col-md-2'>" ;
		h += "<div class='wraptocenter' style='text-align:center;height:"+me.thumbsize+"px'><span></span>" ;
		if ( typeof g.icon != 'undefined' ) h += "<img class='img-responsive' src='" + me.escapeAttribute(g.icon) + "' />" ;
		h += "</div>" ;
		h += "</div>" ;
		h += "<div class='col-xs-8 col-md-10'>" ;
		h += "<h3>" + me.toText ( me.t ( g.label ) ) + "</h3>" ;
		h += "<div>" + me.t ( g.description ) + "</div>" ;
		h += "</div>" ;
		h += "</div>" ;
		return h ;
	} ,
	
	renderMessageBar : function ( msg ) {
		if ( typeof msg == 'undefined' ) return '' ;
		var me = this ;
		var h = '' ;
		h += '<div class="alert alert-'+msg['class']+' alert-dismissible" role="alert">' ;
		h += '<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>' ;
		h += msg.msg ;
		h += '</div>' ;
		return h ;
	} ,
	
	showGames : function ( msg ) {
		var me = this ;
		window.location.hash = '' ;
		var h = '' ;
		h += me.renderMessageBar ( msg ) ;
		h += '<div class="panel panel-default">' ;
		h += '<div class="panel-heading">Available games</div>' ;
		h += '<div class="panel-body"><p>This is a list of available games. Games are loaded from different sources, and you can <a href="#" id="add_new_game">add your own!</a></p></div>' ;
		h += ' <ul class="list-group" id="game_list"></ul>' ;
		h += '</div>' ;
		$('#main').html(h) ;
		$('#add_new_game').click ( function () { me.addNewGame() ; return false } ) ;
		
		var keys = [] ;
		$.each ( me.games , function ( k , v ) { keys.push ( k*1 ) } ) ;
		keys = keys.sort ( function (a,b) { return b-a } ) ;
		
		$.each ( keys , function ( dummy , k ) {
			var v = me.games[k] ;
			if ( v.status != 'OK' ) return ;
			$('#game_list').append ( '<li class="list-group-item">' + me.renderGameEntry ( v ) + '</li>' ) ;
		} ) ;
		$('div.game_entry').css({cursor:'pointer'}).click ( function () { me.startGame ( $(this).attr('gameid')*1 ) ; return false } ) ;
	} ,
	
	sanitizeQ : function ( q ) {
		return 'Q' + (''+q).replace(/\D/g,'') ;
	} ,
	
	controlClick : function ( event ) {
		var me = this ;

		if ( event.o.decision == 'skip' ) {
			return me.nextTile() ;
		}
		
		var g = me.current_game ;
		var name_of_the_game = me.toText ( me.t ( g.label ) ) ;
		
		var actions = event.o.api_action||[] ;
		if ( typeof actions.length == 'undefined' ) actions = [ actions ] ; // Single action => array
		
		if ( typeof event.tile.deferred_decision != 'undefined' ) {
			event.o.decision = event.tile.deferred_decision ;
			$.each ( event.tile.deferred_api_action , function ( k , v ) {
				actions.push ( v ) ;
			} ) ;
		}
		
		var api_actions_j = JSON.stringify ( actions ) ; // For later


		function fin () {
			if ( me.isRunning(-1) ) return ;
		}
		
		// Log action in game central
		me.isRunning(1);
		$.get ( './api.php' , {
			action:'log_action',
			user:me.widar.getUserName(),
			game:g.id,
			tile:event.tile.id,
			decision:event.o.decision,
			api_action:api_actions_j
		} , function ( d ) {
//			console.log ( "GAME CENTRAL" , d ) ;
		} , 'json' ) . always ( function () { fin() } ) ;
	
		// Feedback to game
		me.isRunning(1);
		$.getJSON ( me.getBaseAPI(g) , {
			action:'log_action',
			user:me.widar.getUserName(),
			tile:event.tile.id,
			decision:event.o.decision
		} , function ( d ) {
//			console.log ( "DISTRIBUTED GAME" , d ) ;
		} ) 
 		//.fail ( function () { alert('No or faulty response from the game API') } ) 
		. always ( function () { fin() } ) ;
		
		// Do Wikidata editing
		function do_action ( response ) {
			if ( typeof response != 'undefined' && response.error != 'OK' ) {
				console.log ( "API ERROR" , response ) ;
			}
			if ( actions.length == 0 ) return fin() ;
			var action = actions[0] ;
			actions.shift() ;
			action.summary = "The Distributed Game (" + g.id + "): " + name_of_the_game + " #" + me.widar.tool_hashtag ;
			me.widar.genericAction ( action , function (d) {
				if ( typeof d == 'undefined' ) {
					alert ( "Something went wrong. If this problem persists, please file a bug report!" ) ;
				} else if ( typeof d.error != 'undefined' && d.error != 'OK' ) {
					alert ( d.error ) ;
				}
				do_action() ;
//				setTimeout ( do_action , 500 ) ; // Because Wikidata edits in the same second don't work out well
			} ) ;
		}
		me.isRunning(1);
		do_action() ;

		me.nextTile() ;
	} ,
	
	getBaseAPI : function ( g ) {
		if ( g.api.match(/\?/) ) return g.api+'&callback=?' ;
		return g.api+'?callback=?' ;
	} ,
	
	getQlink : function ( q , title ) {
		var me = this ;
		var qq = 'Q' + (''+q).replace(/\D/g,'') ;
		if ( typeof title == 'undefined' ) title = qq ;
		return "<a target='_blank' class='wikidata' href='//www.wikidata.org/wiki/" + qq + "'>" + me.toText(title) + "</a>" ;
	} ,
	
	renderMap : function ( o ) {
		var style = 'osm-intl';
		var server = 'https://maps.wikimedia.org/';
		
		// Create a map
		var map = L.map(o.id).setView([o.lat*1,o.lon*1], o.zoom*1);

		// Add a map layer
		L.tileLayer(server + style + '/{z}/{x}/{y}.png', {
			maxZoom: 18,
			id: o.id+'-01',
			attribution: 'Wikimedia maps beta | Map data &copy; <a href="http://openstreetmap.org/copyright">OpenStreetMap contributors</a>'
		}).addTo(map);
		
		L.marker([o.lat*1, o.lon*1]).addTo(map);
		
//		setTimeout ( function () { map.invalidateSize() } , 10 ) ;
	} ,
	
	
	loadFileDescription : function ( file , callback ) {
		$.getJSON ( '//commons.wikimedia.org/w/api.php?callback=?' , {
			action:'parse',
			page:'File:'+file,
			format:'json'
		} , function ( d ) {
			if ( typeof d.parse == 'undefined' ) return callback() ;
			var nh = $('<div>').append ( $.parseHTML ( d.parse.text['*'] ) ) ;
			nh.find('#cleanup').remove() ;
			var desc = $(nh.find('td.description')) ;
			if ( desc.length == 0 ) desc = $(nh.find('div.description')) ;
			if ( desc.length == 0 ) desc = '<i>No description or no {{Information}} template</i>' ;
			else desc = desc.html() ;
			callback ( desc ) ;
		} )
		 //.fail ( function () { alert('Error when loading Commons file description') } )  ;
	} ,
	
	loadThumbnail : function ( file , size , callback ) {
		$.getJSON ( 'https://commons.wikimedia.org/w/api.php?callback=?' , {
			action:'query',
			titles:'File:'+file,
			prop:'imageinfo',
			iiprop:'url|size',
			iiurlwidth:size,
			iiurlheight:size,
			format:'json'
		} , function ( d ) {
			var ii ;
			$.each ( (d.query.pages||[]) , function ( k , v ) { ii = v } ) ;
			if ( typeof ii != 'undefined' && typeof ii.imageinfo != 'undefined' ) callback ( ii.imageinfo[0] ) ;
			else callback() ;
		} )
		 //.fail ( function () { alert('Error when getting Commons image thumbnail') } ) ;
	} ,
	
	appendGame : function ( tile ) {
		var me = this ;
		var h = '' ;
		
		var maps = [] ;
		var files = [] ;
		
		h += "<div class='gametile row' id='gametile_"+tile.secnum+"'>" ;
		
		// Sections
		$.each ( tile.sections , function ( section_number , sec ) {
			h += "<div class='col-md-12 section'>" ;
			if ( sec.type == 'item' ) {
				var q = me.sanitizeQ ( sec.q ) ;
				h += "<div class='item_preview' q='" + q + "'>" ;
				h += "<div class='item_label'>" + me.getQlink(q) + "...</div>" ;
				h += "<div class='item_labels'></div>" ;
				h += "<div class='item_options'></div>" ;
				h += "<div class='item_description clearfix'></div>" ;
				h += "</div>" ;
			} else if ( sec.type == 'files' ) {
				h += "<div class='file_list'>" ;
				$.each ( (sec.files||[]) , function ( k , file ) {
					var id = 'file_row_' + me.serial ;
					me.serial++ ;
					var q = me.sanitizeQ ( sec.item ) ;
					h += "<div class='row file_row' id='" + id + "'>" ;
					h += "<div class='col-md-3 col-sm-5 file_thumbnail_container'></div>" ;
					h += "<div class='col-md-9 col-sm-7 file_meta_section'>" ;
					h += "<div class='file_title'>" + me.escapeAttribute ( file.replace(/_/g,' ') ) + "</div>" ;
					h += "<div class='file_description'></div>" ;
					h += "<div class='file_actions'>" ;
					h += '<div class="btn-group" role="group" aria-label="...">' ;
					h += '<button type="button" class="file_button btn btn-success" q="' + q + '" prop="P18" file="' + me.escapeAttribute(file) + '">Image</button>' ;
					$.each ( me.file_props , function ( group_name , props ) {
						h += '<div class="btn-group" role="group">' ;
						h += '<button type="button" class="btn btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">' + group_name + ' <span class="caret"></span></button>' ;
						h += '<ul class="dropdown-menu">' ;
						$.each ( props , function ( name , p ) {
							h += '<li><a href="#" class="file_button" q="' + q + '" prop="P' + p + '" file="' + me.escapeAttribute(file) + '">' + name + '</a></li>' ;
						
						} ) ;
						h += "</ul></div>" ;
					} ) ;
/*
					// Can not do this ATM
					if ( me.original_params.testing ) {
						h += '<button type="button" class="request_extraction_button btn btn-warning" file="' + me.escapeAttribute(file) + '">Request extraction</button>' ;
					}
*/
					h += "</div></div></div></div>" ;
					files.push ( { id : id , file : file } ) ;
				} ) ;
				h += "</div>" ;
			} else if ( sec.type == 'url' ) {
				var url = sec.url ;
				if ( url.match ( /^http:/ ) ) url = './proxy.php?url=' + encodeURIComponent ( url ) ;
				h += "<div class='sec_text_title'>" ;
				h += "<a target='_blank' class='external' href='" + me.escapeAttribute(sec.url) + "'>" + me.toText(sec.url) + "</a>" ;
				h += "</div>" ;
				h += "<iframe style='width:100%;height:200px;' src='" + me.escapeAttribute(url) + "'></iframe>" ;
			} else if ( sec.type == 'text' || sec.type == 'html' ) {
				if ( typeof sec.title != 'undefined' ) {
					h += "<div class='sec_text_title'>" ;
					if ( typeof sec.url != 'undefined' ) h += "<a target='_blank' class='external' href='" + me.escapeAttribute(sec.url) + "'>" + me.toText(sec.title) + "</a>" ;
					else h += me.toText(sec.title) ;
					h += "</div>" ;
				}
				var clean = ( sec.type == 'html' ) ? me.toHtml : me.toText;
				h += "<div class='sec_text'>" + clean( sec.text||'' ) + "</div>" ;
			} else if ( sec.type == 'wikipage' && typeof sec.wiki != 'undefined' ) {
				var m = sec.wiki.match ( /^(.+)wiki$/ ) ;
				if ( m == null ) console.log ( sec.wiki ) ;
				var l = m[1] ;
				var url = 'https://' + l + '.wikipedia.org/wiki/' + encodeURIComponent(sec.title.replace(/ /g,'_')) ;
				h += "<div class='sec_text_title'>" ;
				h += "<a target='_blank' class='external' href='" + me.escapeAttribute(url) + "'>" + me.toText(sec.title) + "</a>" ;
				h += " <small>[" + me.toText(sec.wiki) + "]</small>" ;
				h += "</div>" ;
				h += "<div class='wikipage_text' lang='"+me.escapeAttribute(l)+"' title='"+me.escapeAttribute(sec.title)+"'><i>Loading...</i></div>" ;
			} else if ( sec.type == 'map' ) {
				var id = 'map_' + me.serial ;
				me.serial++ ;
				h += "<div id='" + id + "' style='height:300px'></div>" ;
				maps.push ( { id:id, lat:sec.lat, lon:sec.lon, zoom:sec.zoom||6 } ) ;
			} else {
				console.log ( "Unknown section type" , sec ) ;
			}
			h += "</div>" ;
		} ) ;

		// Controls
		var control_actions = [] ;
		var shortcuts = { yes:1 , skip:2 , no:3 } ;
		var type2class = { green:'btn-success' , white:'btn-default' , blue:'btn-primary' , yellow:'btn-warning' } ;
		h += "<div class='col-md-12 control_box'><div class='row'>" ;
		if ( me.widar.isLoggedIn() ) {
			$.each ( tile.controls , function ( section_number , sec ) {
				h += "<div class='col-md-12 control'>" ;
				if ( sec.type == 'buttons' ) {
					h += "<div style='text-align:center'>" ;
					h += "<div class='btn-group btn-group-lg' role='group' aria-label='...'>" ;
					$.each ( (sec.entries||[]) , function ( k , v ) {
						var control_id = 'control_' + me.serial ;
						me.serial++ ;
						h += "<button id='" + control_id + "' type='button' class='btn btn-lg" ;
						if ( typeof type2class[v.type||''] != 'undefined' ) h += ' ' + type2class[v.type] ;
						h += "'" ;
						
						var ak = '' ;
						if ( typeof shortcuts[v.decision] != 'undefined' ) ak = shortcuts[v.decision] ;
						else if ( typeof v.shortcut != 'undefined' && v.shortcut.length == 1 ) ak = me.toText(v.shortcut) ;
						
						if ( ak != '' ) {
							h += " title='Or press " + ak + "'" ;
							var game_id = me.current_game.id ;
							var tile_id = tile.id ;
							if ( typeof me.shortcuts[game_id] == 'undefined' ) me.shortcuts[game_id] = {} ;
							if ( typeof me.shortcuts[game_id][tile_id] == 'undefined' ) me.shortcuts[game_id][tile_id] = {} ;
							me.shortcuts[game_id][tile_id][ak] = control_id ;
						}
						
						h += ">" + v.label + "</button>" ;
						control_actions.push ( { id:control_id , tile:tile , o:v } ) ;
					} ) ;
					h += "</div>" ;
					h += "</div>" ;
				}
				h += "</div>" ;
			} ) ;
		} else {
			h += "<div class='col-md-12 control' style='text-align:center;font-size:14pt'>" ;
			h += "You need to " + me.widar.getLoginLink('log in') + " to play this game!" ;
			h += "</div>" ;
		}
		h += "</div></div>" ;

		h += "</div>" ;
		
		$('#tiles').append ( h ) ;


		
		// Post-coital cleanup
		
		// Button click events
		$.each ( control_actions , function ( k , v ) {
			$('#'+v.id).click ( function () {
				me.controlClick ( v ) ;
			} ) ;
		} ) ;
		
		// Wikipage
		$('#gametile_'+tile.secnum+' div.wikipage_text').each ( function () {
			var o = $(this) ;
			var lang = o.attr('lang') ;
			var title = o.attr('title') ;
			me.loadWikiIntro ( lang , title , function ( desc ) {
				o.html ( desc ) ;
				me.addGoogleTranslateLink ( o ) ;
			} ) ;
		} ) ;
		
		// Files
		$.each ( files , function ( k , v ) {
			var cnt = 2 ;
			var bad = false ;
			var desc ;
			
			function fin () {
				cnt-- ;
				if ( cnt > 0 ) return ;
				if ( !bad ) return ;
				console.log ( "BAD" , v ) ;
				$('#'+v.id).remove() ;
			}
			
			me.loadThumbnail ( v.file , me.thumbsize , function ( imageinfo ) {
				if ( typeof imageinfo == 'undefined' ) { bad = true ; return fin() }
				var h = "<a href='" + imageinfo.descriptionurl + "' target='_blank' class='commons'>" ;
				h += "<img src='" + imageinfo.thumburl + "' border=0 /></a>" ;
				$('#'+v.id+' div.file_thumbnail_container').html ( h ) ;
				fin() ;
			} ) ;
			
			me.loadFileDescription ( v.file , function ( desc ) {
				if ( typeof desc == 'undefined' ) { bad = true ; return fin() }
				var h = desc ;
				$('#'+v.id+' div.file_description').html ( h ) ;
				$('#'+v.id+' div.file_description > table').remove() ;
				$('#'+v.id+' div.file_description a').attr ( 'target' , '_blank' ) ;
				fin() ;
			} ) ;
			
			$('#'+v.id+' div.file_actions .file_button').click ( function () {
				var o = $(this) ;
				var file = o.attr('file') ;
				var prop = o.attr('prop') ;
				var q = o.attr('q') ;
				
//					array ('action'=>'wbcreateclaim','entity'=>"$q",'snaktype'=>'value','property'=>'P131',
//						'value'=>'{"entity-type":"item","numeric-id":'.$c.'}'
				var action = {
					action:'wbcreateclaim',
					entity:q,
					snaktype:'value',
					property:prop,
					value:JSON.stringify(file.replace(/_/g,' '))
				} ;
				tile.deferred_decision = 'yes' ;
				tile.deferred_api_action.push ( action ) ;
				
//				console.log ( q , prop , file ) ;

				if ( o.parents('div.file_list').find('div.file_row').length == 1 ) { // Last one, auto-save if only one option
					var candidates = [] ;
					$.each ( control_actions , function ( k , v ) {
						if ( v.o.decision == 'skip' ) return ;
						candidates.push ( v ) ;
					} ) ;
					if ( candidates.length != 1 ) return ;
					$('#'+candidates[0].id).click() ;
				}

				o.parents('div.file_row').fadeOut( function () {
					$(this).remove() ;
				} ) ;
				return false ;
			} ) ;
			
/*
			// Can not do this ATM			
			$('#'+v.id+' div.file_actions .request_extraction_button').click ( function () {
				var o = $(this) ;
				var file = o.attr('file') ;
				
				o.parents('div.file_row').fadeOut( function () {
					$(this).remove() ;
				} ) ;
				return false ;
			} ) ;
*/			
			
		} ) ;
		
		// Wikidata item view
		$('#gametile_'+tile.secnum+' div.item_preview').each ( function () {
			var o = $(this) ;
			var q = o.attr('q') ;
			
			var cnt = 2 ;
			function fin2 () {
				cnt-- ;
				if ( cnt > 0 ) return ;

				o.find('div.item_options span.label-success').addClass('selected_lang_link') ;
				var desc = $.trim ( o.find('div.item_description').text() ) ;
				if ( desc == 'Cannot auto-describe' || desc == '' ) {
					var any , pref , main ;
					o.find('div.item_options a.item_language_link').each ( function () {
						var x = $(this) ;
						var l = x.attr('lang') ;
						if ( l == 'auto' ) return ;
						if ( l == me.getMainLang() ) main = x ;
						else if ( -1 != $.inArray ( l , me.user_settings.languages ) ) pref = x ;
						else if ( typeof any == 'undefined' ) any = x ;
					} ) ;
//					console.log ( o.find('div.item_label').text() , main , pref , any ) ;
					if ( typeof main != 'undefined' ) main.click() ;
					else if ( typeof pref != 'undefined' ) pref.click() ;
					else if ( typeof any != 'undefined' ) any.click() ;
				}
			}

			// Language options
			me.wd.getItemBatch ( [q] , function () {
				var i = me.wd.getItem(q) ;
				if ( typeof i == 'undefined' ) return fin2() ;
				var links = [] ;
				links.push ( { lang:'auto' , label:'Auto' } ) ;
				var sitelinks = i.getWikiLinks() ;
				$.each ( sitelinks , function ( wiki , v ) {
					var m = wiki.match ( /^(.+)(wik.+)$/ ) ;
					if ( m == null ) return ;
					var l = m[1] ;
					var p = m[2] ;
					if ( p == 'wiki' ) p = 'wikipedia' ;
					else l += '.' + p ;
					links.push ( { lang:m[1] , label:l , page:v.title , project:p } ) ;
				} ) ;
				var h = '' ;
				$.each ( links , function ( k , v ) {
					if ( k > 0 ) h += ' | ' ;
					h += "<span class='label " ;
					if ( v.lang == 'auto' ) h += "label-success" ;
					else if ( -1 != $.inArray(v.lang,me.user_settings.languages) ) h += "label-primary" ;
					else h += "label-default" ;
					h += "'><a href='#' class='itemoption item_language_link'" ;
					h += " lang='" + v.lang + "'" ;
					h += " title='" + me.escapeAttribute(v.page) + "'" ;
					h += " project='" + me.escapeAttribute(v.project) + "'" ;
					h += ">" + v.label + "</a></span>" ;
				} ) ;
				o.find('div.item_options').html ( h ) ;
				o.find('div.item_options a.itemoption').click ( me.clickItemOption ) ;
				
				// Alternative labels
				h = '' ;
				var main_label = i.getLabel() ;
				var labels = {} ;
				$.each ( (i.raw.labels||{}) , function ( k , v ) {
					var label = v.value ;
					if ( typeof label == 'undefined' ) return ;
					if ( label == main_label ) return ;
					if ( typeof labels[label] == 'undefined' ) labels[label] = 0 ;
					labels[label]++ ;
				} ) ;
				$.each ( (i.raw.aliases||{}) , function ( k , v ) {
					var label = v.value ;
					if ( typeof label == 'undefined' ) return ;
					if ( label == main_label ) return ;
					if ( typeof labels[label] == 'undefined' ) labels[label] = 0 ;
					labels[label]++ ;
				} ) ;
				$.each ( labels , function ( k , v ) {
					if ( typeof k == 'undefined' ) return ;
					h += "<div class='item_lang_label'>" + k + "</div>" ;
				} ) ;
				o.find('div.item_labels').html ( h ) ;
				
				if ( !i.hasClaimItemLink('P31','Q5') ) $($('a.file_button[q="'+q+'"][prop="P990"]').parents('li').get(0)).remove() ; // Remove "voice recording" option for non-humans

				o.find('div.item_label').html ( "<b>" + me.getQlink(q,main_label) + "</b> <span class='qnum'>[" + q + "]</span>" ) ;
				
				fin2() ;
			} ) ;
			
			// Automatic description
			$.getJSON ( '//autodesc.toolforge.org/?q='+q+'&lang='+me.getMainLang()+'&mode=long&links=text&format=json&media=1&thumb='+me.thumbsize+'&zoom=6&callback=?' , function ( d ) {
				var desc = d.result ;
				if ( desc.match(/Cannot auto/) && d.manual_description != '' ) desc = d.manual_description ;
				
				if ( typeof d.media != 'undefined' && typeof d.media.image != 'undefined' ) {
					var image = d.media.image[0] ;
					if ( typeof d.thumbnails != 'undefined' && typeof d.thumbnails[image] != 'undefined' ) {
						var i = d.thumbnails[image] ;
						var h = "<div class='item_thumb'>" ;
						h += "<a href='" + me.escapeAttribute(i.descriptionurl) + "'>" ;
						h += "<img src='" + me.escapeAttribute(i.thumburl) + "' /></a></div>\n" ;
						desc = h + desc ;
					}
				}

				if ( typeof d.media != 'undefined' && typeof d.thumbnails.osm_map != 'undefined' ) {
					if ( typeof d.thumbnails != 'undefined' && typeof d.thumbnails.osm_map != 'undefined' ) {
						var i = d.thumbnails.osm_map ;
						var h = "<div class='item_thumb'>" ;
						h += "<a href='" + me.escapeAttribute(i.descriptionurl) + "'>" ;
						h += "<img src='" + me.escapeAttribute(i.thumburl) + "' /></a></div>\n" ;
						desc = h + desc ;
					}
				}
				
				me.autodesc_cache[q] = desc ;
				o.find('div.item_description').html ( desc ) ;
				o.find('a').each ( function () {
					var o = $(this) ;
					o.attr ( 'target' , '_blank' ) ;
				} ) ;
				
				fin2() ;
				
			} ) .fail ( function () {
				o.find('div.item_label').html ( "<b>" + me.getQlink(q) + "</b> <span class='qnum'>[" + q + "]</span>" ) ;
				o.find('div.item_description').html ( "<i>Automatic description failed.</i>" ) ;
				fin2() ;
			} ) ;
		} ) ;


		// Maps
		$.each ( maps , function ( k , v ) {
			me.renderMap ( v ) ;
		} ) ;
		
	} ,
	
	loadWikiIntro : function ( lang , title , callback , project ) {
		var server = lang + '.'+(project||'wikipedia')+'.org' ;
		$.getJSON ( '//'+server+'/w/api.php?callback=?' , {
			action:'query',
			prop:'extracts',
			exchars:1000,
//			explaintext:1,
			titles:title.replace(/ /g,'_') ,
			format:'json'
		} , function ( d ) {
			$.each ( ((d.query||{}).pages||{}) , function ( k , v ) {
				var t = v.extract.split ( "\n" ) ;
				t[t.length-1] = t[t.length-1].replace ( /...\s*$/m , '' ) ;
				v.extract = $.trim ( t.join ( "\n" ) ) ;
				callback ( v.extract ) ;
			} ) ;
		} )
 		//.fail ( function () { alert('Error when getting Wiki intro') } ) ;
	} ,
	
	clickItemOption : function () {
		var me = wikidata_distributed_game ;
		var o = $(this) ;
		var p = $(o.parents('div.item_preview').get(0)) ;
		var lang = o.attr('lang') ;
		var title = o.attr('title') ;
		var project = o.attr('project')||'wikipedia' ;
		var q = p.attr('q') ;

		$(o.parents('div').get(0)).find('span.selected_lang_link').removeClass('selected_lang_link') ;
		$(o.parents('span').get(0)).addClass('selected_lang_link') ;
		
		
		if ( lang == 'auto' ) {
			var desc = me.autodesc_cache[q] ;
			p.find('div.item_description').html ( desc ) ;
		} else {
			me.loadWikiIntro ( lang , title , function ( desc ) {
				var o = p.find('div.item_description') ;
				o.html ( desc ) ;
				if ( lang != me.getMainLang() ) me.addGoogleTranslateLink ( o ) ;
				o.append ( "<div class='source_wiki_link'>From <a target='_blank' href='//"+lang+"."+project+".org/wiki/"+me.escapeAttribute(title.replace(/ /g,'_'))+"'>"+lang+"."+project+"</a></div>" ) ;
			} , project ) ;
		}
		
		return false ;
	} ,


	addGoogleTranslateLink : function ( o ) {
		var me = this ;
		var text = o.text().replace(/\n/g,' ').split(/\s+/) ;
		while ( text.join(' ').length > 300 ) text.pop() ; // URL length
		text = text.join(' ') ;
		var url = 'https://translate.google.com/#auto/' + me.getMainLang() + '/' + encodeURIComponent(text) ;
		var h = '' ;
		h += "<div style='float:right;margin-left:10px;margin-bottom:5px;padding:2px;text-align:right'>" ;
		h += "<a href='" + me.escapeAttribute(url) + "' class='external' target='_blank'>Google<br/>Translate</a>" ;
		h += "</div>" ;
		o.prepend(h);
	} ,
	
	showCurrentGame : function () {
		var me = this ;
		var g = me.current_game ;
		
		$.each ( g.cache , function ( num , tile ) {
			if ( tile.visible ) return ;
			tile.secnum = me.serial++ ;
			if ( typeof tile.deferred_api_action == 'undefined' ) tile.deferred_api_action = [] ;
			me.appendGame ( tile ) ;
			tile.visible = true ;
		} ) ;
		
		if ( me.vertical ) $('div.control_box').addClass ( 'control_box_vertical' ) ;
		$('#tiles div.gametile:first-child div.control_box').show() ; // Show controls for top tile
	} ,
	
	nextTile : function () {
		var me = this ;
		var g = me.current_game ;
		if ( g.cache.length > 0 ) {
			g.cache.shift() ;
/*			var id = g.cache[0].id ;
			var tmp = [] ;
			$.each ( g.cache , function ( k , v ) {
				if ( v.id == id ) return ;
				tmp.push ( v ) ;
			} ) ;
			g.cache = tmp ;*/
		}
		$('div.gametile:first').animate({height:'toggle',opacity:0.25},500,'swing',function(){
			$('div.gametile:first').remove() ;
			me.updateCurrentGame() ;
		})
	} ,
	
	sanitizeID : function ( id ) {
		return id ; // TODO FIXME
	} ,
	
	startGame : function ( id , start_options ) {
		var me = this ;
		var g = me.games[''+id] ;
		if ( typeof g == 'undefined' ) {
			return me.showGames ( { 'class':'danger',msg:"The game you tried to play does not exists, or is deactivated. Please try another one!"} ) ;
		}
		me.current_game = g ;
		
		var h = '' ;
		h += "<div class='row lead'>" ;
		h += "<div class='col-md-12'>" ;
		if ( g.testing ) h += "<div class='alert alert-warning'>You are playing this game in test mode! <a id='store_game' href='#'>Add it permanently</a> once you've tested it.</div>" ;
		h += "<div class='alert alert-warning' style='display:none' id='low_tiles_warning'>This game is low on tiles. Maybe play a different game for a while?</div>" ;
		h += "<div class='alert alert-warning' style='display:none' id='bad_api_reply_warning'>This game has produced an error. Maybe talk to " + g.owner + " about that?</div>" ;
		h += "<div class='game_title'>" + me.toText ( me.t ( g.label ) ) + "</div>" ;
		h += "<div class='game_description'>" + me.t ( g.description ) + "</div>" ;
		if ( typeof g.instructions != 'undefined' ) h += "<div class='game_instructions'>" + me.t ( g.instructions ) + "</div>" ;
		if ( typeof g.chosen_options == 'undefined' ) g.chosen_options = start_options||{} ;
		if ( typeof g.options != 'undefined' ) {
			h += "<div>" ;
			$.each ( g.options , function ( k , v ) {
				h += "<div style='display:inline-block;margin-right:30px'>" ;
				h += "<span>" + me.toText ( v.name ) + "</span> : " ;
				v.input_name = 'game_options_' + me.sanitizeID ( v.key ) ;
				if ( Object.values(v.values).length > 20 ) {
					h += "<select name='" + v.input_name + "' key='" + me.escapeAttribute(v.key) + "'>" ;
					$.each ( v.values , function ( k2 , v2 ) {
						h += "<option value='" + me.escapeAttribute(k2) + "'" ;
						if ( typeof g.chosen_options[v.key] == 'undefined' ) g.chosen_options[v.key] = k2 ;
						if ( g.chosen_options[v.key] == k2 ) h += ' selected' ;
						h += ">" + v2 ;
						h += "</option>" ;
					} ) ;
					h += "</select>"
				} else {
					h += '<div class="btn-group" data-toggle="buttons">' ;
					$.each ( v.values , function ( k2 , v2 ) {
						h += '<label class="btn btn-primary' ;
						if ( typeof g.chosen_options[v.key] == 'undefined' ) g.chosen_options[v.key] = k2 ;
						if ( g.chosen_options[v.key] == k2 ) h += ' active' ;
						h += '">' ;
						h += '<input type="radio" name="' + v.input_name + '" key="' + me.escapeAttribute(v.key) + '" value="' + me.escapeAttribute(k2) + '" autocomplete="off"' ;
						if ( g.chosen_options[v.key] == k2 ) h += ' checked' ;
						h += '> ' + v2 + '</label>' ;
					} ) ;
					h += "</div>" ;
				}
				h += "</div>" ;
			} ) ;
			h += "</div>" ;
		}
		h += "</div></div>" ;
		h += "<div id='tiles' class='row'></div>" ;
		$('#main').html ( h ) ;
		
		$('#store_game').click ( me.storeGame ) ;
		
		$.each ( (g.options||{}) , function ( k , v ) {
			$('#main div.lead input[name="'+v.input_name+'"]').change ( function () {
				var o = $(this) ;
				var key = o.attr('key') ;
				var value = o.attr('value') ;
				g.chosen_options[key] = value ;
				g.cache = [] ;
				me.startGame ( id ) ;
			} ) ;
			$('#main div.lead select[name="'+v.input_name+'"]').change ( function () {
				var o = $(this) ;
				var key = o.attr('key') ;
				var value = o.val() ;
				g.chosen_options[key] = value ;
				g.cache = [] ;
				me.startGame ( id ) ;
			} ) ;
		} ) ;

		var loc = [] ;
		loc.push ( 'game='+id ) ;
		var j = JSON.stringify ( g.chosen_options ) ;
		if ( j != '{}' ) loc.push ( 'opt='+encodeURIComponent(j) ) ;
		if ( me.original_params.testing ) loc.push ( 'testing=1' ) ;
		if ( !g.testing ) window.location.hash = loc.join ( '&' ) ;
		
		$.each ( g.cache , function ( k , v ) { v.visible = false } ) ;
		
		me.updateCurrentGame(me.precache_games_lower) ;
	} ,
	
	updateCurrentGame : function ( num_load ) {
		var me = this ;
		var g = me.current_game ;
		if ( g.cache.length < me.precache_games_lower && !g.updating_cache ) {
			g.updating_cache = true ;
			me.isRunning(1);
			var params = {
				action:'tiles' ,
				num:((num_load||me.precache_games_upper)-g.cache.length) ,
				lang:me.getMainLang(),
				in_cache:[],
				random_number:Math.random()
			} ;
			$.each ( g.cache , function ( k , v ) { params.in_cache.push ( v.id ) } ) ;
			params.in_cache = params.in_cache.join(',') ;
			
			$.each ( (g.chosen_options||{}) , function ( k , v ) {
				params[k] = v ;
			} ) ;
			$.getJSON ( me.getBaseAPI(g) , params , function ( d ) {
				g.updating_cache = false ;
				var is_object = false ;
				$.each ( d , function ( k , v ) {
					if ( !$.isNumeric(k) ) is_object = true ;
				} ) ;
				
				if ( is_object ) {
					if ( d.low || (d.tiles||[]).length==0 ) $('#low_tiles_warning').show() ;
					else $('#low_tiles_warning').hide() ;
					$.each ( (d.tiles||[]) , function ( dummy , tile ) {
						g.cache.push ( tile ) 
					} ) ;
				} else {
					$.each ( d , function ( dummy , tile ) {
						g.cache.push ( tile ) 
					} ) ;
				}
			} ) .fail ( function () {
				$('#bad_api_reply_warning').show() ;
			} ) .always ( function () {
				me.isRunning(-1) ;
				me.showCurrentGame() ;
			} ) ;
		}
		me.showCurrentGame() ;
	} ,
	
	getRecentChanges : function ( o , callback ) {
		var me = this ;
		var params = { action:'rc' } ;
		if ( typeof o.user != 'undefined' ) params.user = o.user ;
		if ( typeof o.max != 'undefined' ) params.max = o.max ;
		me.isRunning(1);
		$.get ( './api.php' , params , function ( d ) {
			me.isRunning(-1);
			callback ( d.data ) ;
		} ) ;
	} ,
	
	showUserSettings : function () {
		var me = wikidata_distributed_game ;
		me.current_game = undefined ;
		window.location.hash = 'mode=settings' ;
		
		var h = '' ;
		h += '<div class="panel panel-default" id="user_settings">' ;
		h += '<div class="panel-heading">Your personal settings</div>' ;
		h += '<div class="panel-body"></div>' ;
		h += '</div>' ;
		h += '<div class="panel panel-default" id="user_rc">' ;
		h += '<div class="panel-heading">Your recent edits</div>' ;
		h += '<div class="panel-body"></div>' ;
		h += '</div>' ;
		$('#main').html(h) ;
		
		function showUserSettings () {
			var h = '' ;
			h += "<form class='form form-inline'>" ;
			h += "<div>Your languages <input type='text' id='user_languages' value='" + me.user_settings.languages.join(',') + "' /> (comma-separated, primary first)</div>" ;
			h += "<div><vutton class='btn btn-primary' id='save_user_settings'>Save</button></div>" ;
			h += "</form>" ;
			$('#user_settings div.panel-body').html ( h ) ;
			$('#save_user_settings').click ( function () {
				var langs = $('#user_languages').val().replace(/\s/g,'').toLowerCase() ;
				if ( langs == '' ) langs = 'en' ;
				me.user_settings.languages = langs.split(',') ;
				me.storeUserSettings () ;
				showUserSettings() ;
			} ) ;
		}
		
		showUserSettings() ;
		

		me.getRecentChanges ( { user:me.widar.getUserName() } , function ( rc ) {
			me.renderRecentChanges ( rc , { show_user:false , target:$('#user_rc div.panel-body') } ) ;
		} ) ;
		return false ;
	} ,
	
	showStats : function () {
		var me = wikidata_distributed_game ;

		me.current_game = undefined ;
		window.location.hash = 'mode=stats' ;
		
		var h = '' ;
		h += '<div class="panel panel-default" id="recent_changes">' ;
		h += '<div class="panel-heading">Recent changes</div>' ;
		h += '<div class="panel-body" style="overflow-y:auto;height:500px"></div>' ;
		h += '</div>' ;
		h += '<div class="panel panel-default" id="weekly_stats">' ;
		h += '<div class="panel-heading">Actions this week <span id="week"></span></div>' ;
		h += '<div class="panel-body"></div>' ;
		h += '</div>' ;
		h += '<div class="panel panel-default" id="hourly_stats">' ;
		h += '<div class="panel-heading">Actions during this week, per game, per hour</div>' ;
		h += '<div class="panel-body"><div id="hourly_plot"></div></div>' ;
		h += '</div>' ;
		h += '<div class="panel panel-default" id="total_decisions">' ;
		h += '<div class="panel-heading">Total number of decisions per game</div>' ;
		h += '<div class="panel-body"></div>' ;
		h += '</div>' ;
		$('#main').html(h) ;

		me.isRunning ( 1 ) ;
		$.get ( './api.php' , {
			action:'get_game_stats'
		} , function ( d ) {
			me.isRunning ( -1 ) ;
			
			// Weekly top 10 per game
			$('#week').html ( '(' + d.week + ')' ) ;
			$.each ( d.weekly , function ( game_id , top ) {
				var h = '' ;
				h += "<div class='top10'>" ;
				h += "<table class='table table-condensed table-striped'>" ;
				h += "<thead><tr><th colspan=2>" + me.t ( (me.games[game_id]||{label:{en:'[DEACTIVATED GAME]'}}).label ) + "</th></tr></thead>" ;
				h += "<tbody>" ;
				$.each ( top , function ( k , v ) {
					var u = d.users[v.user] ;
					h += "<tr>" ;
					h += "<td><a target='_blank' href='//www.wikidata.org/wiki/User:" + me.escapeAttribute ( u.replace(/ /g,'_') ) + "'>" + u + "</a></td>" ;
					h += "<td class='num'>" + v.cnt + "</td>" ;
					h += "</tr>" ;
				} ) ;
				h += "</tbody></table>" ;
				h += "</div>" ;
				$('#weekly_stats div.panel-body').append ( h ) ;
			} ) ;
			
			// Weekly activity plot
			var data = {} ;
			$.each ( me.games , function ( gid , g ) {
				data[gid] = {
					data:[] ,
					lines:{show:true},
					points:{show:true},
					label:me.t(g.label)
				} ;
			} ) ;
			
			$.each ( d.hourly , function ( gid , v ) {
				$.each ( v , function ( hour , cnt ) {
					var date = new Date ( hour.substr(0,4) , hour.substr(4,2)*1-1 , hour.substr(6,2) , hour.substr(8,2) , 0 , 0 ) ;
					var timestamp = date.getTime() ;
					data[gid].data.push ( [ timestamp , cnt ] ) ;
				} ) ;
			} ) ;

			// Don't show games without data; keeps the legend smaller
			$.each ( data , function ( gid , d ) {
				if ( d.data.length == 0 ) delete data[gid] ;
			}) ;
			
			var display_data = [] ;
			$.each ( data , function ( gid , v ) {
				display_data.push ( v ) ;
			} ) ;

			$.plot ( $('#hourly_plot') , display_data ,
				{ yaxis : { label:'Actions' } , xaxis : { label:'Time' , mode:'time' , timeformat:'%a:%H' } , legend : { position:'nw' } }
			) ;
			
			
			// Total decisions
			h = '' ;
			h += "<table class='table table-condensed table-striped'>" ;
			h += "<thead><tr><th>Game</th><th style='text-align:right'>Yes</th><th style='text-align:right'>No</th><th style='text-align:right'>Other</th><th style='text-align:right'>Total</th></tr></thead>" ;
			h += "<tbody>" ;
			var grand_total = 0 ;
			$.each ( d.decisions , function ( game_id , decisions ) {
				var total = decisions['yes']*1+decisions['no']*1+decisions['other']*1 ;
				grand_total += total ;
			} ) ;

			$.each ( d.decisions , function ( game_id , decisions ) {
				var total = decisions['yes']*1+decisions['no']*1+decisions['other']*1 ;
				h += "<tr>" ;
				if ( typeof me.games[game_id] == 'undefined' ) {
					h += "<td>[DEACTIVATED GAME]</td>" ;
				} else {
					let owner = me.games[game_id].owner ;
					let owner_url = "https://www.wikidata.org/wiki/User:"+encodeURIComponent(owner) ;
					h += "<td>" + me.t ( me.games[game_id].label ) + " <small>[<a href='"+owner_url+"' target='_blank'>"+owner + "</a>]</small></td>" ;
				}
				$.each ( ['yes','no','other'] , function ( k , v ) {
					if ( decisions[v]*1 == 0 ) h += "<td></td>" ;
					else h += "<td class='num'>" + me.getPrettyNumber(decisions[v]) + "<div class='percent'>(" + me.getPrettyPercent ( decisions[v] , total ) + ")</div></td>" ;
				} ) ;
				h += "<td class='num'>" + me.getPrettyNumber(total) + "<div class='percent'>(" + me.getPrettyPercent(total,grand_total) + ")</div></td>" ;
				h += "</tr>" ;
			} ) ;
			h += "<tfoot><tr><td>Total</td><td colspan='4' class='num'>" + me.getPrettyNumber(grand_total) + "</td></tr>" ;
			h += "</tbody></table>" ;
			$('#total_decisions div.panel-body').append ( h ) ;


		} , 'json' ) ;

		me.getRecentChanges ( {max:50} , function ( rc ) {
			me.renderRecentChanges ( rc , { show_user:true , target:$('#recent_changes div.panel-body') } ) ;
		} ) ;
		
		return false ;
	} ,
	
	getPrettyPercent : function ( part , total ) {
		var x = part * 100 / total ;
		return Math.round(x) + '%' ;
	} ,
	
	getPrettyNumber : function ( nStr ) {
		x = (''+nStr).split('.');
		x1 = x[0];
		x2 = x.length > 1 ? '.' + x[1] : '';
		var rgx = /(\d+)(\d{3})/;
		while (rgx.test(x1)) {
			x1 = x1.replace(rgx, '$1' + ',' + '$2');
		}
		return x1 + x2;
	} ,

	
	renderRecentChanges : function ( rc , o ) {
		var me = this ;
		var h = "" ;
		h += "<table class='table table-condensed table-striped'>" ;
		h += "<thead><tr><th>Game</th><th>Item(s)</th>" ;
		if ( o.show_user ) h += "<th>User</th>" ;
		h += "<th>Decision</th><th>Time <small>[UTC]</small></th></tr></thead>" ;
		h += "<tbody>" ;
		$.each ( rc , function ( k , v ) {
		
			var qs = [] ;
			var j = JSON.parse ( v.api_action ) ;
			$.each ( j , function ( k1 , v1 ) {
				if ( typeof v1.action == 'undefined' ) return ;
				var q ;
				if ( v1.action == 'wbsetsitelink' || v1.action == 'wbsetdescription' ) q = v1.id ;
				else if ( v1.action == 'wbcreateclaim' ) q = v1.entity ;
				else if ( v1.action == 'wbmergeitems' ) {
					qs.push ( me.getQlink(v1.fromid) ) ;
					qs.push ( me.getQlink(v1.toid) ) ;
				} else if ( v1.action == 'wbremoveclaims' ) {
					qs.push ( me.getQlink ( v1.claim.replace(/\$.+$/,'') ) ) ;
				} else if ( v1.action == 'wbsetclaim' ) {
					c = JSON.parse ( v1.claim ) ;
					qs.push ( me.getQlink ( c.id.replace(/\$.+$/,'') ) ) ;
				} else {
					console.log ( v1 ) ;
				}
				if ( typeof q != 'undefined' ) qs.push ( me.getQlink(q) ) ;
			} ) ;
			
			var qs2 = {} ;
			$.each ( qs , function ( k3 , v3 ) { qs2[v3] = v3 } ) ;
			qs = [] ;
			$.each ( qs2 , function ( k3 , v3 ) { qs.push ( v3 ) } ) ;
		
			j = JSON.parse ( v.json ) ;
			h += "<tr>" ;
			h += "<td><a href='#' game='"+v.game+"'>" + me.toText ( me.t ( j.label ) ) + "</a></td>" ;
			h += "<td>" + qs.join(', ') + "</td>" ;
			if ( o.show_user ) h += "<td><a href='//www.wikidata.org/wiki/User:" + me.escapeAttribute(v.user_name.replace(/ /g,'_')) + "' target='_blank'>" + v.user_name + "</a></td>" ;
			h += "<td>" + v.decision + "</td>" ;
			h += "<td>" + me.prettyTimestamp ( v.timestamp ) + "</td>" ;
			h += "</tr>" ;
		} ) ;
		h += "</tbody></table>" ;
		o.target.html ( h ) ;
		o.target.find('a[game]').click ( function () {
			var o = $(this) ;
			me.startGame ( o.attr('game') ) ;
		} ) ;
		if ( typeof o.callback != 'undefined' ) callback() ;
	} ,
	
	prettyTimestamp : function ( ts ) {
		return ts.substr(0,4)+'-'+ts.substr(4,2)+'-'+ts.substr(6,2)+' '+ts.substr(8,2)+':'+ts.substr(10,2)+':'+ts.substr(12,2) ;
	} ,
	
	storeUserSettings : function () {
		var me = this ;
		if ( !me.widar.isLoggedIn() ) return ;
		me.isRunning ( 1 ) ;
		$.get ( './api.php' , {
			action:'store_user_settings',
			user:me.widar.getUserName(),
			settings:JSON.stringify ( me.user_settings )
		} , function ( d ) {
		} , 'json' ) . always ( function () {
			me.isRunning ( -1 ) ;
			
			// Reset games cache, as they may depend on user settings like language
			$.each ( me.games , function ( k , v ) {
				v.cache = [] ;
			} ) ;
		} ) ;
	} ,
	
	addNewGame : function () {
		var me = this ;
		me.current_game = undefined ;
		window.location.hash = 'mode=add_game' ;
		
		var url = 'https://bitbucket.org/magnusmanske/wikidata-game/src/master/public_html/distributed/?at=master' ;
		var h = '' ;
		h += "<div class='lead'>To add a new game, you will have to provide an API. Please check <a href='"+url+"' target='_blank'>the documentation</a> first.</div>" ;
		h += "<div><form id='the_form' class='form form-inline'>" ;
		h += "Your game API URL: " ;
		h += "<input type='text' style='width:500px' id='form_url' /> " ;
		h += "<input type='submit' value='Test game' />" ;
		h += "</form></div>" ;
		
		$('#main').html(h) ;
		
		$('#the_form').submit ( function () {
			var url = $('#form_url').val() ;
			me.testGame ( url ) ;
		} ) ;
		
		return false ;
	} ,
	
	storeGame : function () {
		var me = wikidata_distributed_game ;
		var g = me.current_game ;
		if ( typeof g == 'undefined' || g.id != 0 ) return false ; // Paranoia
		if ( !me.widar.isLoggedIn() ) {
			alert ( "You need to log in to store a game." ) ;
			return false ;
		}
		
		$.get ( './api.php' , {
			action:'store_game',
			user:me.widar.getUserName() ,
			api:g.api
		} , function ( d ) {
			me.games = d.data ;
			me.prepGames() ;
			me.startGame ( d.id ) ;
		} , 'json' ) ;
		
		
		return false ;
	} ,
	
	testGame : function ( url ) {
		var me = this ;
		me.current_game = undefined ;
		window.location.hash = 'mode=test_game&url=' + encodeURIComponent(url) ;
		$('#main').html ( "<i>Loading test game...</i>" ) ;
		me.games = { 0:{ api:url } } ;
		
		function failed ( msg ) {
			var h = "<div class='lead'>" ;
			h += "<div><b>" + msg + "</b></div>" ;
			h += "<div><a href='"+me.escapeAttribute(url)+"' target='_blank'>"+url+"</a></div>" ;
			h += "</div>" ;
			$('#main').html ( h ) ;
		}
		
		$.getJSON ( me.getBaseAPI(me.games[0]) , {action:'desc'} , function ( d ) {
			if ( typeof d == 'undefined' ) return failed ( 'No JSON object in your API "action=desc" response' ) ;
			if ( typeof d.label == 'undefined' ) return failed ( 'No labels in your API "action=desc" response' ) ;
			if ( typeof d.label.en == 'undefined' ) return failed ( 'No English label in your API "action=desc" response' ) ;
			if ( typeof d.description == 'undefined' ) return failed ( 'No descriptions in your API "action=desc" response' ) ;
			if ( typeof d.description.en == 'undefined' ) return failed ( 'No English description in your API "action=desc" response' ) ;
			d.api = url ;
			d.testing = true ;
			d.id = 0 ;
			me.games = { 0:d } ;
			me.prepGames() ;
			me.startGame ( 0 ) ;
		} ) .fail ( function () { failed('No response from your API, or no valid JSON!') } ) ;
	} ,
	
	
	
	fin : ''
} ;


$(document).ready ( function () {
	wikidata_distributed_game.init() ;
} ) ;