/********************************************************************************************************************************************
 game - main object
*********************************************************************************************************************************************/

var wdgame = {
//	test_site : ( null != (window.location+'').match(/\/test\b/) ) ,
	thumbsize : 120 ,
	main_screen_languages : [ 'en' ] ,
	first_screen : true ,
	fade_time : 250 ,
	is_logged_into_widar : false ,
	user_name : '' ,
	user_is_bot : false ,
//	user_is_admin : false ,
	is_horizontal : true ,
	init_individual_games : false ,
	tool_hashtag : 'wikidata-game' ,
	widar_api : '/api.php' ,
	api : './api.php' ,
	wd_api : '//www.wikidata.org/w/api.php?callback=?' ,
	flagged_items_page : 'Wikidata:The_Game/Flagged_items' ,
	icons : {
		info : '//upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Information_green.svg/120px-Information_green.svg.png' ,
		stats : '//upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Gnome-power-statistics.svg/120px-Gnome-power-statistics.svg.png' ,
		settings : '//upload.wikimedia.org/wikipedia/commons/thumb/c/c2/VisualEditor_-_Icon_-_Settings.svg/120px-VisualEditor_-_Icon_-_Settings.svg.png' ,
		random : '//upload.wikimedia.org/wikipedia/commons/thumb/7/70/Random_font_awesome.svg/120px-Random_font_awesome.svg.png' ,
		merge : '//upload.wikimedia.org/wikipedia/commons/thumb/1/10/Pictogram_voting_merge.svg/120px-Pictogram_voting_merge.svg.png' ,
		person : '//upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Biography_note.svg/120px-Biography_note.svg.png' ,
		nogender : '//upload.wikimedia.org/wikipedia/commons/thumb/6/67/Crystal_Clear_app_Login_Manager.svg/120px-Crystal_Clear_app_Login_Manager.svg.png' ,
		nationality : '//upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Four_color_world_map.svg/120px-Four_color_world_map.svg.png' ,
		disambig : '//upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Disambiguation.svg/120px-Disambiguation.svg.png' ,
		no_date : '//upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Yin_and_Yang.svg/120px-Yin_and_Yang.svg.png' ,
		no_image : '//upload.wikimedia.org/wikipedia/commons/thumb/5/59/Gnome-emblem-photos.svg/120px-Gnome-emblem-photos.svg.png' ,
		no_item : '//upload.wikimedia.org/wikipedia/commons/thumb/3/39/Nuvola_Red_Plus.svg/120px-Nuvola_Red_Plus.svg.png' ,
		no_author : '//upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Nuvola_apps_bookcase_1_blue.svg/120px-Nuvola_apps_bookcase_1_blue.svg.png' ,
		occupation : '//upload.wikimedia.org/wikipedia/commons/thumb/f/fb/HSLegal.svg/120px-HSLegal.svg.png' ,
		alma_mater : '//upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Oxygen480-categories-applications-education-university.svg/120px-Oxygen480-categories-applications-education-university.svg.png' ,
		commonscat : '//upload.wikimedia.org/wikipedia/commons/thumb/5/53/Red-black%2C_but_not_AVL_tree.svg/120px-Red-black%2C_but_not_AVL_tree.svg.png' ,
		red_flag : '//upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Flag-red.svg/20px-Flag-red.svg.png'
	} ,
	wikipedia_text_cache : {} ,
	mode : '' ,
	modes : {} ,
	lang : 'en' ,
	in_dialog : false ,
	settings : {
		whitelist:'',
		blacklist:'',
		image_instance:'',
		whitelist_exclusive:false ,
		direct_delete:false
	} ,
	months : {} ,
	bad_lang_codes : {
		'no':'nb',
		'bat-smg':'sgs',
		'simple':'en',
		'be-x-old':'be-tarask',
		'fiu-vro':'vro',
		'zh-yue':'yue',
		'zh-min-nan':'nan',
		'zh-classical':'lzh'
	} ,

	initGames : function () {
		var self = this ;
		// Start pre-caching
		var table2key = {} ;
		$.each ( self.modes , function ( k , v ) {
			v.mode = k ; // So the object knows its key
			v.data_cache = [] ;
			v.init() ;
			table2key[v.mysql_table] = k ;
		} ) ;

		if ( self.init_individual_games ) return ;
		
		$.get ( wdgame.api , {
			user:self.user_name ,
			action:'get_candidate' ,
			table:'all'
		} , function ( d ) {
			$.each ( d.data , function ( table , data ) {
				var k = table2key[table] ;
				if ( typeof self.modes[k] == 'undefined' ) return ;
				self.modes[k].processCandidatesFromAPI ( { data:data } , false ) ;
			} ) ;
		} , 'json' ) ;

	} ,
	
	// Loading month names, including aliases, from ALL languages. Cool!
	initMonths : function () {
		var self = this ;
		var month_q = ['Q108','Q109','Q110','Q118','Q119','Q120','Q121','Q122','Q123','Q124','Q125','Q126'] ;
		self.wd.getItemBatch ( month_q , function () {
			$.each ( month_q , function ( num_zero , q ) {
				var i = self.wd.items[q] ;
				var wl = i.getWikiLinks() ;
				$.each ( wl , function ( site , v ) {
					var m = site.match ( /^(.+)wiki$/ ) ;
					if ( m == null ) return ;
					var lang = m[1].replace('_','-')  ;
					if (lang in self.bad_lang_codes) {
						lang = self.bad_lang_codes[lang] ;
					} ;
					var labels = i.getAliasesForLanguage(lang,true) ;
					$.each ( labels , function ( k2 , v2 ) {
						if ( typeof self.months[lang] == 'undefined' ) self.months[lang] = {} ;
						self.months[lang][v2] = num_zero+1 ;
					} ) ;
					
				} ) ;
			} ) ;
			self.init2() ;
		} ) ;
	} ,

	init : function () {
		var self = this ;
		
		if ( typeof $.cookie('v2') == 'undefined' ) {
			$('#v2').show() ;
			$('#v2 button').click ( function () {
				$.cookie('v2', 'seen', { expires: 3650 });
			} ) ;
		}

		
		self.is_horizontal = screen.height < screen.width ;
		self.wd = new WikiData() ;
		self.params = self.getUrlVars() ;
		if ( typeof self.params.mode != 'undefined' ) self.mode = self.params.mode ;
		
		self.initMonths() ;
	} ,
	
	init2 : function () {
		var self = this ;
		
		$(window).keypress ( function ( e ) {
			if ( self.in_dialog ) return ;
			var code = e.keyCode || e.which;
			var validCodes = { 49:0, 50:1, 51:2, 97:0, 115:1, 100:2, 1092:0, 1099:1, 1110:1, 1074:2}; // "1", "2", "3"; "a", "s", "d"; "ф", "ы"/"і", "в" (ru/uk layout)
			if ( typeof self.modes[self.last_mode] == 'undefined' ) return ;
			if ( Object.keys(validCodes).indexOf(code.toString()) == -1 ) return;
			if ( typeof self.modes[self.last_mode].buttons[validCodes[code]] == 'undefined' ) return ;
			$('#'+self.modes[self.last_mode].buttons[validCodes[code]]).click() ;
		} ) ;
		
		$(window).keyup ( function ( e ) {
			if ( self.in_dialog ) return ;
			var code = e.keyCode || e.which;
			if ( typeof self.modes[self.last_mode] == 'undefined' ) return ;
			var button = -1;
			switch(code) {
				case 37:
					button = 0 ;
					break;
				case 40:
					button = 1 ;
					break;
				case 39:
					button = 2 ;
					break;
				default:
    				return;
			}
			if ( typeof self.modes[self.last_mode].buttons[button] == 'undefined' ) return ;
			$('#'+self.modes[self.last_mode].buttons[button]).click() ;
		} ) ;
		
		$('#head_title').click ( function () {
			self.mode = '' ;
			self.showMainScreen() ;
		} ) ;

		self.checkOauthStatus ( function () {
			if ( !self.is_logged_into_widar ) {
				self.showMainScreen() ;
			} else {
				self.initGames() ;
				self.loadUserSettings ( function () {
					self.showNextScreen() ;
				} ) ;
			}
		} ) ;
	} ,

	getUrlVars : function () {
		var vars = {} ;
		var hashes = window.location.href.slice(window.location.href.indexOf('#') + 1) ;
		if ( hashes == window.location.href ) hashes = '' ;
		hashes = hashes.split('&');
		$.each ( hashes , function ( i , j ) {
			var hash = j.split('=');
			hash[1] += '' ;
			vars[hash[0]] = decodeURI(hash[1]);
		} ) ;
		return vars;
	} ,

	checkOauthStatus : function ( callback ) {
		var self = this ;
		self.is_logged_into_widar = false ;
		$.get ( self.widar_api , {
			action:'get_rights',
			botmode:1
		} , function ( d ) {
			
			var h = '' ;
			if ( d.error != 'OK' || d.result == null || typeof (d.result||{}).error != 'undefined' ) {
	//			h += "<div><a title='You need to authorise WiDaR to edit on your behalf if you want this tool to edit Wikidata.' target='_blank' href='/widar/index.php?action=authorize'>WiDaR</a><br/>not authorised.</div>" ;
			} else {
				self.is_logged_into_widar = true ;
				self.user_name = d.result.query.userinfo.name ;
	//			h += "<div>Logged into <a title='WiDaR authorised' target='_blank' href='/widar/'>WiDaR</a> as " + d.result.query.userinfo.name + "</div>" ;
				$.each ( d.result.query.userinfo.groups , function ( k , v ) {
					if ( v == 'bot' ) self.user_is_bot = true ;
					if ( v == 'sysop' ) self.user_is_admin = true ;
				} ) ;
				h = "<small><a title='Your user settings' href='?#mode=settings' onclick=\"wdgame.setMode('settings') ; wdgame.showSettingsScreen(); return false\">" + self.user_name + "</a></small>" ;
			}
			$('#widar_state').html ( h ) ;
			if ( typeof callback != 'undefined' ) callback() ;
		} , 'json' ) ;
	} ,

/*	
	// Obsolete. Keeping around just in case.
	doesExist : function ( q , callback ) { // Does an item exist?
		var self = this ;
		q = self.fixQ ( q ) ;
		$.getJSON ( self.wd_api , {
			action : 'query' ,
			prop : 'info' ,
			titles : q ,
			format : 'json'
		} , function ( data ) {
			$.each ( data.query.pages , function ( k , v ) {
				if ( k == -1 ) {
					callback ( q.replace(/\D/g,'')*1 , false ) ;
				} else {
					callback ( q.replace(/\D/g,'')*1 , true ) ;
				}
			} )
		} ) ;
	} ,
*/
	
	fixQ : function ( q ) {
		return 'Q'+(q+'').replace(/\D/g,'') ;
	} ,

	loadItemSummary : function ( params ) {
		var self = this ;
		var q = self.fixQ ( params.q ) ;
		$(params.target).html ( "<i>Loading item " + q + "...</i>" ) ;
		var to_load = [q] ;
		$.each ( (params.qs||[]) , function ( k , v ) { to_load.push ( v ) } ) ;
		self.wd.getItemBatch ( to_load , function () {
			var i = self.wd.items[q] ;
			if ( typeof i == 'undefined' ) {
				console.log ( q + " not loaded??" ) ;
			}
			var r = i.raw ;
			var labels = {} ;
			$.each ( (r.labels||{}) , function ( k , v ) {
				if ( typeof labels[v.value] == 'undefined' ) labels[v.value] = 0 ;
				labels[v.value] += 2 ;
			} ) ;
			$.each ( (r.aliases||{}) , function ( k0 , v0 ) {
				$.each ( v0 , function ( k , v ) {
					if ( typeof labels[v.value] == 'undefined' ) labels[v.value] = 0 ;
					labels[v.value] += 1 ;
				} ) ;
			} ) ;
			
			var keys = [] ;
			$.each ( labels , function ( k , v ) { keys.push ( k ) } ) ;
			keys.sort ( function ( a , b ) { return ( labels[b] - labels[a] ) ; } ) ;
			
			var h = '' ;
			var thumb_id = 'thumb_' + params.q ;
			h += "<div style='float:right;margin-left:5px;margin-bottom:2px'><a title='Flag this item as problematic. This will remove this candidate from the game.' class='red_flag' href=''><img src='"+self.icons.red_flag+"' border=0 /></a></div>" ;
			h += "<div style='float:right;margin-left:5px;margin-bottom:2px' id='" +  thumb_id + "'></div>" ;
			h += "<h4>Item <a href='//www.wikidata.org/wiki/" + q + "' target='_blank'>" + q + "</a></h4>" ;
			h += "<div>" ; // Title
			$.each ( keys , function ( dummy , k ) {
				h += "<div class='item_label'>" ;
				if ( typeof params.highlight_label != 'undefined' && params.highlight_label == k ) h += "<b>" + k + "</b>" ;
				else h += k ;
				// h += " (" + labels[k] + "×)" ; // Not a "real" count, but weighted
				h += "</div>" ;
			} ) ;
			h += "</div>" ; // Title
			
			h += "<div>" ; // Desc
			$.each ( (r.descriptions||{}) , function ( k , v ) {
				h += "<div class='item_desc'>" + v.value + "</div>" ;
			} ) ;
			h += "</div>" ; // Desc
			
			var props = i.getPropertyList() ;
			var to_load = [] ;
			$.each ( props , function ( dummy0 , p ) {
				to_load.push ( p ) ;
				$.each ( (i.getClaimItemsForProperty(p,true)||[]) , function ( k , v ) { to_load.push(v) } ) ;
			} ) ;
			
			self.wd.getItemBatch ( to_load , function () {

				var sub_h = [] ;
				$.each ( props , function ( dummy0 , p ) {
					var a = i.getStringsForProperty ( p ) ;
					var pre = false ;
					if ( a.length == 0 ) {
						var b = i.getClaimItemsForProperty(p) ;
						$.each ( b , function ( k , v ) {
							a.push ( self.wd.items[v].getLink({target:'_blank'}) ) ;
						} ) ;
						pre = true ;
					}
					if ( a.length == 0 ) {
						$.each ( r.claims[p] , function ( dummy , claim ) {
							var b = i.getClaimDate ( claim ) ;
							if ( typeof b == 'undefined' ) return ;
							var t = b.time ;
							if ( typeof t == 'undefined' ) return ;
							if ( t.substr(0,1) == '-' ) a.push ( '-'+t.substr(1,10) ) ;
							else a.push ( t.substr(1,10) ) ;
						} ) ;
					}
					if ( a.length == 0 ) return ;
					var h2 = '' ;
					h2 += "<div class='item_kv'>" ;
					h2 += "<div class='item_prop'>" + self.wd.items[p].getLabel() + "</div>" ;
					h2 += "<div class='item_prop_values'>" + a.join(", ") + "</div>" ;
					h2 += "</div>" ;
					if ( pre ) sub_h.unshift ( h2 ) ;
					else sub_h.push ( h2 ) ;
				} ) ;
				h += "<div>" + sub_h.join('') + "</div>" ; // Item props, links, string values
				
				h += "<div>" ; // Sitelinks
				var max_lang_num = 999999 ;
				var best_lang_num = max_lang_num ;
				var server ;
				var page ;
				var langlist = self.settings.whitelist.replace(/\s/g,'').split(',').concat(self.wd.main_languages) ;
				$.each ( (r.sitelinks||[]) , function ( k , v ) {
					var m = k.match(/^(.+)(wiki)$/) ;
					if ( m == null ) m = k.match(/^(.+)(wik.+)$/) ;
					var tmp_server ;
					if ( m != null ) {
						var lang = m[1].replace('_','-') ;
						var project = m[2] ;
						if ( project == 'wiki' ) project = 'wikipedia' ;
						tmp_server = lang + '.' + project + '.org' ;
//						if ( project == 'wikipedia' ) {
							if ( best_lang_num == max_lang_num ) {
								server = tmp_server ;
								page = v.title ;
								best_lang_num = max_lang_num - 1 ;
							}
							$.each ( langlist , function ( nml , ml ) {
								if ( ml != lang ) return ;
								if ( nml >= best_lang_num ) return ;
								best_lang_num = (project == 'wikipedia') ? nml : nml * 100 ;
								server = tmp_server ;
								page = v.title ;
							} ) ;
//						}
					}
					h += "<div class='item_sitelink'>" + k + ": " ;
					if ( typeof tmp_server != 'undefined' ) h += "<a target='_blank' href='//"+tmp_server+"/wiki/"+v.title.replace(/'/g,'%27') + "'>" + v.title + "</a>" ;
					else h += v.title ;
					h += "</div>" ;
				} ) ;
				h += "</div>" ; // Sitelinks
				
				h += "<div class='site_preview'></div>" ;

				$(params.target).html ( h ) ;
				
				$(params.target+' a.red_flag').click ( function () {
//					console.log ( q + " is problematic" ) ;
					var text = "\n\n===[["+q+"]] in "+self.last_mode + "===\n[["+q+"]] has been flagged by [[User:"+self.user_name+"|]] in the ''"+self.last_mode+"'' game." ;
					var id = 'flagging_' + q ;
					self.modes[self.last_mode].removeCurrentCandidateFromGame() ;
					$('#run_status').append ( "<div id='"+id+"' class='color:red'>Flagging "+q+"...</div>" ) ;
					$.get ( wdgame.widar_api , {
						action:'append',
						tool_hashtag:wdgame.tool_hashtag ,
						text:text,
						page:self.flagged_items_page,
						botmode:1
					} , function ( d ) {
						$('#'+id).remove();
					} , 'json' ) ;
					return false ;
				} ) ;
				
				var mmf = i.getMultimediaFilesForProperty('P18') ;
				if ( mmf.length > 0 ) {
					$.getJSON ( '//commons.wikimedia.org/w/api.php?callback=?' , {
						action:'query',
						titles:'File:'+mmf[0],
						prop:'imageinfo',
						format:'json',
						iiprop:'url',
						iiurlwidth:self.thumbsize,
						iiurlheight:self.thumbsize
					} , function ( d ) {
						var ii ;
						$.each ( ((d.query||{}).pages||{}) , function ( k , v ) {
							ii = v.imageinfo[0] ;
						} ) ;
						if ( typeof ii == 'undefined' ) return ; // Something's wrong
						var h = "" ;
						h += "<div style='width:"+ii.thumbwidth+"px;height:"+ii.thumbheight+"px'>" ;
						h += "<a target='_blank' href='"+ii.descriptionurl+"'>" ;
						h += "<img border=0 src='" + ii.thumburl + "' />" ;
						h += "</a></div>" ;
						$('#'+thumb_id).html ( h ) ;
					} ) ;
				}
				
				if ( typeof server != 'undefined' ) { // Show preview
					self.loadWikipediaText ( server , page , function ( text ) {
						if ( text == '' ) {
							var h = "<div class='site_preview_title'></div><div class='site_preview_text'></div>" ;
							$(params.target+' div.site_preview').html(h).hide() ;
						} else {
							var lang = server.split('.').shift() ;
							var h = "<div class='site_preview_title'><b>" + server + ": <a target='_blank' href='//" + server + "/wiki/" + page.replace(/'/g,'%27') + "'>" + page.replace(/_/g,' ') + "</a></b></div>" ;
							if (lang in self.bad_lang_codes) {
								lang = self.bad_lang_codes[lang] ;
							} ;
							h += "<div class='site_preview_text' lang='"+lang+"'>" + text + "</div>" ;
							$(params.target+' div.site_preview').html ( h ) ;
						}
						if ( typeof params.callback != 'undefined' ) params.callback() ;
					} ) ;
				} else {
					if ( typeof params.callback != 'undefined' ) params.callback() ;
				}
				
			} ) ;
			
		} ) ;
	} ,
	
	loadWikipediaText : function ( server , page , callback ) {
		var self = this ;
		var key = server + "::" + page ;
		if ( typeof self.wikipedia_text_cache[key] != 'undefined' ) {
			if ( typeof callback != 'undefined' ) callback ( self.wikipedia_text_cache[key] ) ;
			return ;
		}
		$.getJSON ( '//'+server+'/w/api.php?callback=?' , {
			action:'query',
			prop:'extracts',
			exchars:1000,
//			exsentences:10,
			explaintext:1,
			titles:page ,
			format:'json'
		} , function ( d ) {
			$.each ( ((d.query||{}).pages||{}) , function ( k , v ) {
				self.wikipedia_text_cache[key] = $.trim(v.extract) ;
				if ( typeof callback != 'undefined' ) callback ( self.wikipedia_text_cache[key] ) ;
			} ) ;
		} ) ;
	} ,

	showMainScreen : function () {
		var self = this ;
		
		self.updateHash() ;
		
		// Show main page
		var use_lang = self.lang ;
		if ( -1 == $.inArray ( use_lang , self.main_screen_languages ) ) use_lang = 'en' ;
		
		$.get('main_pages/'+use_lang+'.html?rand='+Math.random(), function(html) {
			$('#main').html ( html ) ;
			$.each ( self.icons , function ( k , v ) {
				$('div.main_page_box[mode="'+k+'"] div.mpb_icon').html ( "<img src='" + v + "'/>" ) ;
			} ) ;
			if ( !self.is_logged_into_widar ) $('#main div.widar_note').show() ;
			var nw = $('#main div.main_page_box').width()-140 ;
			$('#main div.mpb_text').width(nw) ;
			$('#main div.main_page_box').each ( function () {
				var o = $(this) ;
				var mode = o.attr ( 'mode' ) ;
				if ( mode == 'info' ) {
					o.css ( { cursor : 'pointer' } ) ;
					o.click ( function () { o.find('div.wdgame_desc').toggle() } ) ;
					return ;
				}
				if ( !self.is_logged_into_widar ) return ;
				if ( mode == 'stats' || mode == 'settings' ) {
					o.css ( { cursor : 'pointer' } ) ;
					if ( mode == 'stats' ) o.click ( function () { self.setMode('stats') ; self.showStatsScreen() } ) ;
					if ( mode == 'settings' ) o.click ( function () { self.setMode('settings') ; self.showSettingsScreen() } ) ;
					return ;
				}
				if ( mode != 'random' && typeof self.modes[mode] == 'undefined' ) return ;
				o.css ( { cursor : 'pointer' } ) ;
				o.click ( function () {
					self.setMode ( mode ) ;
					self.showNextScreen() ;
				} ) ;
			} ) ;
			$('#main div.mpb_text a').click ( function () {
				var url = $(this).attr('href') ;
				window.open(url , '_blank');
				return false ;
			} ) ;
		} ) ;
		
	} ,
	
	loadUserSettings : function ( callback ) {
		var self = this ;
		$.get ( self.api , {
			action:'get_settings',
			user:self.user_name
		} , function ( d ) {
			if ( d.data != '' ) self.settings = JSON.parse ( d.data ) ;
			if ( typeof callback != 'undefined' ) callback() ;
		} ) ;
	} ,
	

	showSettingsScreen : function () {
		var self = this ;
		$('#main').html ( "<i>Loading settings...</i>" ) ;
		self.loadUserSettings ( function () {
			var hint = 'Language codes, separated by comma' ;
			var h = '' ;
			h += "<h2>User settings</h2>" ;
			h += "<table class='table-condensed table-striped'><tbody>" ;
			h += "<tr><th>Never show languages</th><td><input type='text' class='span3' id='blacklist' value='" + self.settings.blacklist + "' title='"+hint+"' placeholder='"+hint+"' /></td></tr>" ;
			h += "<tr><th>Prefer languages</th><td><input type='text' class='span3' id='whitelist' value='" + self.settings.whitelist + "' title='"+hint+"' placeholder='"+hint+"' /><br/>" ;
			h += "<label><input type='checkbox' id='whitelist_exclusive' "+(self.settings.whitelist_exclusive?'checked':'')+"/> Only use these languages</label> <small>(This can slow down your game experience!)</small></td></tr>" ;
			
		//	if ( self.user_is_admin ) h += "<tr><th>Delete</th><td><label><input type='checkbox' id='direct_delete' "+(self.settings.direct_delete?'checked':'')+" /> Delete directly after merging</label></td></tr>" ;
			
			h += "<tr><th>Image instance</th><td><input type='text' id='image_instance' placeholder='5 for Q5=human etc.' value='" ;
			h += (self.settings.image_instance||'') ;
			h += "' /> <small>only suggest images for items with a link to Qxxx; this can slow down your game experience!</small></td></tr>" ;
			
			
			h += "<tr><td style='text-align:center' colspan=2>" ;
			h += "<button class='btn btn-success' id='save_settings'>Save</button> " ;
			h += "<button class='btn btn-default' id='cancel'>Cancel</button>" ;
			h += "</td></tr>" ;
			h += "</tbody></table>" ;
			
			h += "<hr/><div id='user_history'><i>Loading your recent game history...</i></div>" ;
			
			$('#main').html ( h ) ;
			$('#main label').css({'font-weight':'normal'}) ;
			$('#cancel').click ( function () {
				self.setMode('') ;
				self.showMainScreen() ;
			} ) ;
			$('#save_settings').click ( function () {
				$.each ( ['blacklist','whitelist','image_instance'] , function ( k , v ) {
					self.settings[v] = $('#'+v).val() ;
				} ) ;
				$.each ( ['whitelist_exclusive','direct_delete'] , function ( k , v ) {
					self.settings[v] = $('#'+v).is(':checked') ? true : false ;
				} ) ;

				self.settings.image_instance = self.settings.image_instance.replace(/\D/g,'') ;

				$.get ( self.api , {
					action:'set_settings',
					user:self.user_name ,
					settings:JSON.stringify(self.settings)
				} , function ( d ) {
					self.initGames() ;
					self.setMode('');
					self.showMainScreen() ;
				} ) ;
			} ) ;

			$.get ( self.api , {
				action:'get_user_history',
				user:self.user_name
			} , function ( d ) {
				function qlink ( q ) {
					return "<a target='_blank' href='//www.wikidata.org/wiki/Q" + q + "'>Q" + q + "</a>" ;
				}
				var list = d.data.sort ( function ( a , b ) { return (b.timestamp*1-a.timestamp*1) } ) ;
				while ( list.length > 20 ) list.pop() ; // Max list length
				var h = '' ;
				h += "<h3>Your recent game history</h3>" ;
				h += "<table class='table-condensed table-striped'>" ;
				h += "<thead><tr><th>#</th><th>Time</th><th>Game</th><th>Item(s)</th><th>Decision</th></tr></thead>" ;
				h += "<tbody>" ;
				$.each ( list , function ( k , v ) {
					h += "<tr>" ;
					h += "<th>" + (k+1) + "</th>" ;
					h += "<td>" + v.timestamp.replace(/^(....)(..)(..)(..)(..)(..)/,'$1-$2-$3 $4:$5:$6') + "</td>" ;
					h += "<td>" + v.mode + "</td>" ;
					if ( v.mode == 'merge' ) {
						h += "<td>" + qlink(v.item1) + "↠" + qlink(v.item2) + "</td>" ;
					} else {
						h += "<td>" + qlink(v.item) + "</td>" ;
					}
					h += "<td>" + v.status + "</td>" ;
					h += "</tr>" ;
				} ) ;
				h += "</tbody></table>" ;
				$('#user_history').html ( h ) ;
			} , 'json' ) ;

			
		} ) ;
	} ,
	
	showStatsScreen : function () {
		var self = this ;
		var show_done = true ;
		$('#main').html ( "<i>Loading statistics...</i>" ) ;
		$.get ( self.api , {
			action:'stats',
			user:self.user_name
		} , function ( d ) {
			var perc_factor = 100 ;
			var h = '' ;
			h += "<h2>Game statistics</h2>" ;
			
			var sum = { total:0 , done:0 } ;
			h += "<h3>Overview</h3>" ;
			h += "<div class='lead'>Total number of players: " + d.players + "</div>" ;
			h += "<table class='table-condensed table-striped'>" ;
			h += "<thead><tr><th>Game</th><th>Total</th>" ;
			if ( show_done ) h += "<th>Done</th><th>Done %</th>" ;
			h += "<th>Your score</th><th>Your rank</th></tr></thead>" ;
			h += "<tbody>" ;
			$.each ( d.data , function ( mode , v ) {
				if ( typeof self.modes[mode] == 'undefined' ) return ;
				sum.done += v.done_all*1 ;
				sum.total += (v.done_all*1+v.todo*1) ;
				h += "<tr>" ;
				h += "<th>" + self.modes[mode].name + "</th>" ;
				h += "<td class='num'>" + self.numberWithCommas(v.done_all*1+v.todo*1) + "</td>" ;
				if ( show_done ) {
					h += "<td class='num'>" + self.numberWithCommas(v.done_all*1) + "</td>" ;
					h += "<td class='num'>" + (Math.floor(v.done_all*100*perc_factor/(v.done_all*1+v.todo*1))/perc_factor).toFixed(2) + "%</td>" ;
				}
				h += "<td class='num'>" + self.numberWithCommas(v.your_score) + "</td>" ;
				h += "<td class='num'>" + self.numberWithCommas(v.rank) + "</td>" ;
				h += "</tr>" ;
			} ) ;
			h += "</tbody>" ;
			h += "<tfoot><tr><th>All</th>" ;
			h += "<td class='num'>" + self.numberWithCommas(sum.total) + "</td>" ;
			if ( show_done ) {
				h += "<td class='num'>" + self.numberWithCommas(sum.done) + "</td>" ;
				h += "<td class='num'>" + (Math.floor(sum.done*100*perc_factor/sum.total)/perc_factor).toFixed(2) + "%</td>" ;
			}
			h += "<td></td>" ;
			h += "<td></td>" ;
			h += "</tr></tfoot>" ;
			h += "</table>" ;
			
			h += "<h3>Top 10 players</h3>" ;
			$.each ( d.data , function ( mode , v ) {
				if ( typeof self.modes[mode] == 'undefined' ) return ;
				h += "<div style='display:inline-block;margin-right:30px;'>" ;
				h += "<h4>Game: <i>" + self.modes[mode].name + "</i></h4>" ;
				h += "<table class='table-condensed table-striped'>" ;
				h += "<thead><tr><th>#</th><th>User</th><th>Score</th></tr></thead>" ;
				h += "<tbody>" ;
				$.each ( v.top10 , function ( k2 , v2 ) {
					var u = v2.user ;
					u = "<a target='_blank' href='//www.wikidata.org/wiki/User:" + encodeURIComponent(u) + "'>" + u + "</a>" ;
					if ( v2.user == self.user_name ) u = "<b>" + u + "</b> (you!)" ;
					h += "<tr><td class='num'>" + (k2+1) + "</td><td>" + u + "</td><td class='num'>" + self.numberWithCommas(v2.score) + "</td></tr>" ;
				} ) ;
				h += "</tbody></table>" ;
				h += "</div>" ;
			} ) ;
			
			$('#main').html ( h ) ;
		} ) ;
	} ,
	
	numberWithCommas : function (x) {
    	return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    } ,
	
	updateHash : function () {
		var self = this ;
		var p = [] ;
		if ( self.mode != '' ) p.push ( 'mode='+self.mode ) ;
		window.location.hash = p.join ( '&' ) ;
	} ,
	
	setMode : function ( mode ) {
		var self = this ;
		self.mode = mode ;
		self.updateHash() ;
	} ,

	
	showNextScreen : function () {
		var self = this ;
		$('#main').html('') ;
		if ( self.first_screen && typeof self.params.mode == 'undefined' ) {
			self.first_screen = false ;
			return self.showMainScreen() ;
		}
		
		var mode = self.mode ;
		if ( mode == 'stats' ) return self.showStatsScreen() ;
		if ( mode == 'settings' ) return self.showSettingsScreen() ;
		if ( mode == '' ) mode = 'random' ;
		if ( mode == 'random' ) {
			var modes = [] ;
			$.each ( self.modes , function ( k , v ) { modes.push ( k ) } ) ;
			var index = Math.floor(Math.random() * modes.length);
			mode = modes[index] ;
		}
		if ( typeof self.modes[mode] == 'undefined' ) {
			return self.showMainScreen() ;
		}
		self.last_mode = mode ;
		self.modes[mode].showNewScreen() ;
		$('#main').fadeIn ( self.fade_time ) ;
	} ,


	addStatementItem : function ( item , prop , target , callback ) {
		var self = this ;
		$.get ( wdgame.widar_api , {
			action:'set_claims',
			tool_hashtag:wdgame.tool_hashtag ,
			ids:'Q'+(item+'').replace(/\D/g,''),
			prop:'P'+(prop+'').replace(/\D/g,''),
			target:'Q'+(target+'').replace(/\D/g,''),
			botmode:1
		} , function ( d ) {
			if ( typeof callback != 'undefined' ) callback() ;
		} , 'json' ) ;
	} ,

	addStatementString : function ( item , prop , text , callback ) {
		var self = this ;
		$.get ( wdgame.widar_api , {
			action:'set_string',
			tool_hashtag:wdgame.tool_hashtag ,
			id:'Q'+(item+'').replace(/\D/g,''),
			prop:'P'+(prop+'').replace(/\D/g,''),
			text:text,
			botmode:1
		} , function ( d ) {
			if ( typeof callback != 'undefined' ) callback() ;
		} , 'json' ) ;
	} ,
	
	the_end : true
} ;

/********************************************************************************************************************************************
 generic base object for individual games
*********************************************************************************************************************************************/

var wdgame_generic = {
	data_cache_size : 4 ,
	data_cache : [] ,
	had_id : {} ,
	initialized : false ,
	buttons : [] ,
//	mobile_bottom : 65 ,
	
	setItemStatus : function ( data , mode ) {
		var self = this ;
		$('#run_status div[id='+data.id+']').html ( "Remembering..." ) ;
		$.get ( wdgame.api , {
			action:'set_status',
			table:self.mysql_table ,
			user:wdgame.user_name,
			id:data.id,
			status:mode
		} , function ( d ) {
			$('#'+data.id).remove() ;
		} ) ;
	} ,

	showItem : function ( data ) {
		var self = this ;
		var url = wdgame.icons[self.mode] ;
		var h = "<div style='float:right' title='" + self.name + "'><img width='24px' src='" + url + "'></div>" ;
		h += self.getPageStructure ( data ) ;
		if ( data.show ) {
			self.currentCandidate = data ;
			$('#main').html ( h ) ;
			$("main div.alert").alert() ;
			if ( typeof self.onAlertClose != 'undefined' ) $("#main div.alert button.close").click( self.onAlertClose ) ;
		}
		self.showSections ( data ) ;
		if ( !data.show ) return ; // Pre-caching
		self.addButtonTriggers ( data ) ;
		$.each ( self.buttons , function ( k , v ) {
			$('#'+v).attr ( { title:'Shortcut: '+(k+1) } ) ;
		} ) ;
		$('div.decision button').addClass('btn-lg') ;
		
		if ( !wdgame.is_horizontal ) { // Phone etc.
			$('div.decision').css({position:'fixed',bottom:'0px',left:'0px',right:'0px','z-index':5,margin:'0px'}) ;
			$('div.item_container:last').css({'margin-bottom':(self.mobile_bottom||65)+'px'})
		}
	} ,

	highlightButton : function ( name ) {
		var self = this ;
		$('#'+name).css({'font-weight':'bold'}) ;
		$.each ( self.buttons , function ( k , v ) {
			if ( v == name ) return ;
			$('#'+v).attr({disabled:'disabled'}) ;
		} ) ;
	} ,
	
	processCandidatesFromAPI : function ( d , show ) {
		var self = this ;
		var data = d.data ;
		if ( typeof data == 'undefined' ) { // Something's wrong
			console.log ( "RELOADING" , self.mysql_table , d ) ;
			self.getCandidate ( show ) ;
			return ;
		}
//			data = { id:604155 , item:48632 } ; // TESTING
		if ( typeof self.had_id[data.id] != 'undefined' ) return self.getAndShow ( show ) ;
		self.had_id[data.id] = true ;
		data.show = show ;
		if ( !show ) self.data_cache.push ( data ) ;
		self.showItem ( data ) ;
	} ,

	getAndShow : function ( show ) {
		var self = this ;
		var data ;
		
		if ( show && !wdgame.is_logged_into_widar ) {
			wdgame.showMainScreen() ;
			return ;
		}
		
		if ( !show && self.data_cache.length >= self.data_cache_size ) return ; // Cache full
		
		if ( show ) {
			while ( self.data_cache.length > 0 && self.data_cache[0].id == 0 ) self.data_cache.shift() ; // Remove dummies
		}
		
		if ( show && self.data_cache.length > 0 ) {
			if ( self.debug ) console.log ( "Using cache" ) ;
			data = self.data_cache.shift() ;
			data.show = true ;
			self.showItem ( data ) ;
			return ;
		}
		if ( self.debug ) {
			if ( show ) console.log ( "Not using cache" ) ;
			else console.log ( "Building cache" ) ;
		}

		if ( show ) $('#main').html ( "<i>" + self.loadingMessage + "</i>" ) ;
		
		self.getCandidate ( show ) ;
	} ,
	
	getCandidate : function ( show ) {
		var self = this ;
		$.get ( wdgame.api , {
			user:wdgame.user_name ,
			action:'get_candidate' ,
			table:self.mysql_table
		} , function ( d ) {
			self.processCandidatesFromAPI ( d , show ) ;
		} , 'json' ) ;
	} ,

	removeCurrentCandidateFromGame : function () {
		var self = this ;
//		self.highlightButton ( $(this).attr('id') ) ;
		$('#main').fadeOut ( wdgame.fade_time , function () { wdgame.showNextScreen() ; } ) ;
		self.setItemStatus(self.currentCandidate,'FLAGGED') ;
	} ,

	showNewScreen : function () {
		var self = this ;
		self.getAndShow ( true ) ;
	} ,
	
	init : function () {
		var self = this ;
		if ( self.initialized ) return ;
		self.initialized = true ;
		
		// Pre-cache one item, fill rest of cache with dummies
		while ( self.data_cache.length + 1 < self.data_cache_size ) self.data_cache.push ( { id:0 } ) ;
		if ( wdgame.init_individual_games ) self.getAndShow ( false ) ;
	} ,
	
	the_end : true
}

/********************************************************************************************************************************************
 nogender
*********************************************************************************************************************************************/

wdgame.modes['nogender'] = $.extend ( true , {}, {

//	debug:true,
	name : 'Gender' ,
	mysql_table : 'genderless_people' ,
	loadingMessage : 'Looking for random gender-less person data...' ,
	buttons : ['male','dunno','female'] ,
	gender_marker : {
		af : [ /(\s)(sy)(\s)/gi] ,
		en : [ /(\s)(married|actor)(\s)/gi ] ,
		de : [ /(\s)(sein|seines|ihres)(\s)/gi ] ,
		it : [ /(\s)([^\sA-Z]{3,}ese[.,:;]?|[Ss]posò|fu)(\s)/g ]
	} ,
	gender_male_marker : {
		af : [ /(\s)(hy|akteur)(\s)/gi ] ,
		be : [ /(\s)(нарадзіўся)(\s)/gi ] ,
		bg : [ /(\s)(роден)(\s)/gi ] ,
		cs : [ /(\s)(byl|[^\sA-Z]{2,}[cs]ký|syn(?:em)?|bývalý)(\s)/g , // he was, -ian, son, former
		       /(\s)(básník|fotbalista|historik|hokejista|kněz|novinář|politik|publicista|řiditel|spisovatel|učitel)([\s.,:;])/gi ] , // professions
		da : [ /(\s)(han|ham)(\s)/gi ] ,
		de : [ /(\s)(er|ihn)(\s)/gi ] ,
		en : [ /(\s)(he|him|his|son|king)(\s)/gi ] ,
		eo : [ /(\s)(li|lia|liaj|liajn|lian|lin)(\s)/gi ] , // pronouns
		es : [ /(\s)(él|(?:es|fue|era) (?:uno?|el|lo)|conocido|nacido|hijo)(\s)/gi , // pronouns 
		       /(\s)([^\sA-Z]{3,}(?:or|logo))([\s.,:;])/g , // professions
		       /(\s)([^\sA-Z]{3,}(?:és|ano)|español)([\s.,:;])/g ] , // demonyms
		fr : [ /(\s)(il|(?:est|fut|était|a(?:urait)? été)(?: (?:l')?un(?: homme)?| le)|né)(\s)/gi ,
		       /(\s)(acteur|nommé)(\s)/gi ,
		       /(\s)([^\sA-Z]{3,}(?:[ao]is|ain|eur))([\s.,:;])/g ] ,
		fy : [ /(\s)(hy|him)(\s)/gi ] ,
		gl : [ /(\s)(ela|(?:é|foi|era) (?:o|un))(\s)/gi ,
		       /(\s)(coñecido|na(?:ci)?do|finado|fillo)(\s)/gi ,
		       /(\s)([^\sA-Z]{3,}(?:or|logo)|político|avogado|actor)([\s.,:;])/g , // professions
		       /(\s)(galego)([\s.,:;])/g ] ,
		io : [ /(\s)(il|ili|ilia|ilu|ilua)(\s)/gi , // pronouns
		       /(\s)([-a-z]{0,}(?:ulo))([\s!(),.:;?])/gi ] , // male words
		is : [ /(\s)(fæddur|\w+son)([\s.,:;])/gi ] ,
		it : [ /(\s)(lui|(?:era|fu|è(?: stato| ritenuto)?) (?:il|uno?))(\s)/gi ,
		       /(\s)(italiano|conosciuto|nato|nominato|figlio|padre)([\s.,:;])/gi,
		       /(\s)(attore|duca|politico|[^\sA-Z]{3,}tore)(\s)/gi] ,
		ja : [ /(男|息子|父)/g ],
		mt : [ /(\b)(hu(?:wa)?|kien|twieled)(\s)/gi ] ,
		nl : [ /(\s)(hij|hem|zijn)(\s)/gi ] ,
		no : [ /(\s)(han|ham|hans|sønn)(\s)/gi ] ,
		nb : [ /(\s)(han|ham|son)(\s)/gi ] ,
		nn : [ /(\s)(han|ham)(\s)/gi ] ,
		pl : [ /(\s)(on|był|syn|jego)(\s)/gi ] ,
		pt : [ /(\s)(d?ele|(?:é|foi|era) (?:o|um)|conhecido|considerado|nomeado|nascido|filho|irmão|pai|homem|marido|esposo|casado)(\s)/gi ,
		       /(\s)([^\sA-Z]{3,}(?:or|logo)|rei|conde|marquês|político|deputado|prefeito|ministro|sacerdote|juiz|ator|médico|advogado|engenheiro|arquitec?to|empresário)([\s.,:;])/g , // professions
		       /(\s)([^\sA-Z]{3,}(?:ês|ano)|brasileiro)([\s.,:;])/g ] , // demonyms
		ro : [ /(\s)(el|(?:este|a fost) (?:un(?:ul| om)?)|cunoscut|născut|fiul)(\s)/gi ,
		       /(\s)([^\sA-Z]{3,}(?:or|ar|log))([\s.,:;])/g , // professions
		       /(\s)(român)([\s.,:;])/g ] , // demonyms
		ru : [ /(\s)(он|сын|племянник|родился|[^\s]+ский)(\s)/gi ] ,
		sk : [ /(\s)(bol|[^\sA-Z]{2,}[cs]k[yý]|syn|bývalý)(\s)/g , // he was, -ian, son, former
		       /(\s)(básník|futbalista|hokejista|kňaz|novinár|politik|publicista|riaditeľ|spisovateľ|učiteľ)([\s.,:;])/gi ] , // professions
		sv : [ /(\s)(han|honom)(\s)/gi ] ,
		uk : [ /(\s)(він|син|племінник|народився|[^\s]+ський)(\s)/gi ] ,
		vo : [ /(\s)(om|oma|omas|ome|omes|omi|omik|omis|oms)(\s)/gi , // pronouns
		       /(\s)((?:hi)[-a-zäöü]*)([\s!(),.:;?])/gi ] // male words
	} ,
	gender_female_marker : {
		af : [ /(\s)(haar|aktrise)(\s)/gi ] ,
		be : [ /(\s)(нарадзілася)(\s)/gi ] ,
		bg : [ /(\s)(родена)(\s)/gi ] ,
		cs : [ /(\s)(byla|[^\sA-Z]{2,}[cs]ká|dcer(?:a|ou)|bývalá)(\s)/g , // she was, -ian, daughter, former
		       /(\s)(fotbalistka|historička|hokejistka|novinářka|politička|publicistka|řiditelka|spisovatelka|učitelka)([\s.,:;])/gi ] , // professions
		da : [ /(\s)(hun|henne)(\s)/gi ] ,
		de : [ /(\s)(sie|ihr)(\s)/gi ] ,
		en : [ /(\s)(she|her|hers|daughter|queen|actress|female|(?:[^\s]{3,})?woman)([\s.,:;])/gi ] ,
		eo : [ /(\s)(ŝi|ŝia|ŝiaj|ŝiajn|ŝian|ŝin)(\s)/gi , // pronouns
		       /(\s)([-a-zĉĝĥĵŝŭ]*(?:ino))([\s!(),.:;?])/gi ] , // female words
		es : [ /(\s)(ella|(?:es|fue|era) (?:una|la)|conocida|nacida|hija)(\s)/gi , // pronouns 
		       /(\s)([^\sA-Z]{3,}(?:ora|loga))([\s.,:;])/g , // professions
		       /(\s)([^\sA-Z]{3,}(?:ana)|española)([\s.,:;])/g ] , // demonyms
		fr : [ /(\s)(elle|(?:est|fut|était|a(?:urait)? été)(?: (?:l')?une(?: femme)?| la))(\s)/gi ,
		       /(\s)(actrice|directrice)(\s)/gi ,
		       /(\s)([^\sA-Z]{3,}(?:[ao]ise|aine|euse|ée))([\s.,:;])/g ] ,
		fy : [ /(\s)(sy|har)(\s)/gi ] ,
		gl : [ /(\s)(ela|(?:é|foi|era) (?:a|unha))(\s)/gi ,
		       /(\s)(coñecida|na(?:ci)?da|filla)(\s)/gi ,
		       /(\s)([^\sA-Z]{3,}(?:ora|loga)|actriz)([\s.,:;])/g , // professions
		       /(\s)(galega)([\s.,:;])/g ] ,
		io : [ /(\s)(el|eli|elia|elu|elua)(\s)/gi , // pronouns
		       /(\s)([-a-z]*(?:ino))([\s!(),.:;?])/gi ] , // female words
		is : [ /(\s)(fædd|\w+dóttir)([\s.,:;])/ ] ,
		it : [ /(\s)(lei|(?:era|fu|è(?: stata| ritenuta)?) (?:la|un(?:a|'[a-z-]+)))(\s)/gi ,
		       /(\s)(conosciuta|nata|nominata|figlia|madre|regina|attrice)(\s)/gi ,
		       /(\s)(italiana|[^\sA-Z]{3,}esa)([\s.,:;])/gi ] ,
		ja : [ /()(女|娘|母)()/g ],
		mt : [ /(\b)(hi(?:ja)?|kienet|twieldet)(\s)/gi ] ,
		nl : [ /(\s)(zij|ze|haar)(\s)/gi ] ,
		no : [ /(\s)(hun|henne)(\s)/gi ] ,
		nb : [ /(\s)(hun|henne)(\s)/gi ] ,
		nn : [ /(\s)(hun|henne)(\s)/gi ] ,
		pl : [ /(\s)(ona|była|córka|jej)(\s)/gi ] ,
		pt : [ /(\s)(d?ela|(?:é|foi|era) (?:a|uma)|conhecida|considerada|nomeada|nascida|filha|irmã|mãe|mulher|esposa|casada)(\s)/gi ,
		       /(\s)([^\sA-Z]{3,}(?:ora|loga)|deputada|ministra|ac?triz|rainha|condessa|advogada)([\s.,:;])/g , // professions
		       /(\s)([^\sA-Z]{3,}ana|brasileira)([\s.,:;])/g ] , // demonyms
		ro : [ /(\s)(ea|(?:este|a fost) (?:una|o)|cunoscută|născută|fiica)(\s)/gi ,
		       /(\s)([^\sA-Z]{3,}ă)([\s.,:;])/g , // feminine suffix
		       /(\s)([^\sA-Z]{3,}(?:oare|logă?))([\s.,:;])/g , // professions
		       /(\s)(românc?ă)([\s.,:;])/g ] , // demonyms
		ru : [ /(\s)(она|дочь|племянница|родилась|[^\s]+ская)(\s)/gi ] ,
		sk : [ /(\s)(bola|[^\sA-Z]{2,}[cs]k[aá]|dcéra|bývalá)(\s)/g , // she was, -ian, daughter, former
		       /(\s)(futbalistka|hokejistka|novinárka|poetka|politička|publicistka|riaditeľka|spisovateľka|učiteľka)([\s.,:;])/gi ] , // professions
		sv : [ /(\s)(hon|henne)(\s)/gi ] ,
		uk : [ /(\s)(вона|дочка|племінниця|народилася|[^\s]+ська)(\s)/gi ] ,
		vo : [ /(\s)(of|ofa|ofas|ofe|ofes|ofi|ofik|ofis|ofs)(\s)/gi , // pronouns
		       /(\s)((?:ji)[-a-zäöü]*)([\s!(),.:;?])/gi ] // female words
	} ,
	
	getPageStructure : function ( data ) {
		var self = this ;
		var h = '' ;
		h += "<div>This item represents a person, but has no sex/gender property.</div>" ;
		h += "<div id='data' class='item_container'></div>" ;
		h += "<div class='decision'>" ;
		h += "<div class='btn-group'>" ;
		h += "<button id='male' class='btn btn-success'>Male</button> " ;
		h += "<button id='dunno' class='btn btn-default' accesskey='x'>Not sure</button> " ;
		h += "<button id='female' class='btn btn-primary'>Female</button> " ;
		h += "</div>" ;
		h += "</div>" ;
		return h ;
	} ,
	showSections : function ( data ) {
		var self = this ;
		wdgame.loadItemSummary ( {q:data.item , target:data.show?'#data':'#nope' , callback:function () {
			self.getAndShow ( false ) ;
			if ( !data.show ) return ;
			$('div.site_preview_text').each ( function () {
				var o = $(this) ;
				var lang = o.attr('lang') ;
				var t = o.html() ;
				$.each ( (self.gender_male_marker[lang]||[]) , function ( k , v ) {
					t = t.replace ( v , "$1<span class='highlightM'>\$2</span>$3" ) ;
				} ) ;
				$.each ( (self.gender_female_marker[lang]||[]) , function ( k , v ) {
					t = t.replace ( v , "$1<span class='highlightF'>\$2</span>$3" ) ;
				} ) ;
				$.each ( (self.gender_marker[lang]||[]) , function ( k , v ) {
					t = t.replace ( v , "$1<span class='highlight'>\$2</span>$3" ) ;
				} ) ;
				o.html ( t ) ;
			} ) ;
		} } ) ;
	} ,
	addButtonTriggers : function ( data ) {
		var self = this ;
		$('#male').click ( function () {
			self.highlightButton ( $(this).attr('id') ) ;
			$('#main').fadeOut ( wdgame.fade_time , function () { wdgame.showNextScreen() ; } ) ;
			$('#run_status').append ( "<div id='"+data.id+"'>Marking Q"+data.item+" as male...</div>" ) ;
			wdgame.addStatementItem ( data.item , 'P21' , 'Q6581097' , function () { self.setItemStatus(data,'MALE') } ) ;
		} ) ;
		$('#female').click ( function () {
			self.highlightButton ( $(this).attr('id') ) ;
			$('#main').fadeOut ( wdgame.fade_time , function () { wdgame.showNextScreen() ; } ) ;
			$('#run_status').append ( "<div id='"+data.id+"'>Marking Q"+data.item+" as female...</div>" ) ;
			wdgame.addStatementItem ( data.item , 'P21' , 'Q6581072' , function () { self.setItemStatus(data,'FEMALE') } ) ;
		} ) ;
		$('#dunno').click ( function () {
			self.highlightButton ( $(this).attr('id') ) ;
			$('#main').fadeOut ( wdgame.fade_time , function () {
				wdgame.showNextScreen() ;
			} ) ;
		} ) ;
	}

} , wdgame_generic ) ;


/********************************************************************************************************************************************
 disambig
*********************************************************************************************************************************************/

// THIS GAME HAS BEEN COMPLETED!
wdgame.modes['disambig'] = $.extend ( true , {}, {

//	debug:true,
	name : 'Disambiguation' ,
	mysql_table : 'potential_disambig' ,
	loadingMessage : 'Looking for random item that could be a disambiguation...' ,
	buttons : ['given_name','surname','both','disambig','dunno','no_disambig'] ,
	mobile_bottom : 140 ,

	getPageStructure : function ( data ) {
		var self = this ;
		var h = '' ;
		h += "<div>This item has no \"instance of\", and could be a disambiguation. Please mark given (first) names and family names (surnames) as such, they will get both instances!</div>" ;
		h += "<div id='data' class='item_container'></div>" ;
		h += "<div class='decision'>" ;
		h += "<div style='margin-bottom:3px'>" ;
		h += "<div class='btn-group'>" ;
		h += "<button id='given_name' class='btn btn-success'>Given name</button> " ;
		h += "<button id='surname' class='btn btn-success'>Surname</button> " ;
		h += "<button id='both' class='btn btn-success'>Both</button> " ;
		h += "</div> " ;
		h += "</div>" ;
		h += "<div class='btn-group'>" ;
		h += "<button id='disambig' class='btn btn-success'>Disambig</button> " ;
		h += "<button id='dunno' class='btn btn-default' accesskey='x'>Not sure</button> " ;
		h += "<button id='no_disambig' class='btn btn-primary'>Other</button> " ;
		h += "</div>" ;
		h += "</div>" ;
		return h ;
	} ,
	showSections : function ( data ) {
		var self = this ;
		wdgame.loadItemSummary ( {q:data.item , target:data.show?'#data':'#nope' , callback:function () {
			self.getAndShow ( false ) ;
			if ( !data.show ) return ;
			$('div.site_preview_text').each ( function () {
				var o = $(this) ;
				var t = o.html() ;
				t = t.replace ( /\b(given name|first name|surname|family name)s{0,1}\b/gi , "<span class='highlight'>\$1</span>" ) ;
				t = t.replace ( /(ships{0,1})\b/gi , "<span class='highlight'>\$1</span>" ) ;
				o.html ( t ) ;
			} ) ;
		} } ) ;
	} ,
	addButtonTriggers : function ( data ) {
		var self = this ;
		$('#disambig').click ( function () {
			self.highlightButton ( $(this).attr('id') ) ;
			$('#main').fadeOut ( wdgame.fade_time , function () { wdgame.showNextScreen() ; } ) ;
			$('#run_status').append ( "<div id='"+data.id+"'>Marking Q"+data.item+" as disambig...</div>" ) ;
			wdgame.addStatementItem ( data.item , 'P31' , 'Q4167410' , function () { self.setItemStatus(data,'YES') } ) ;
		} ) ;
		$('#given_name').click ( function () {
			self.highlightButton ( $(this).attr('id') ) ;
			$('#main').fadeOut ( wdgame.fade_time , function () { wdgame.showNextScreen() ; } ) ;
			$('#run_status').append ( "<div id='"+data.id+"'>Marking Q"+data.item+" as given name <i>and</i> disambig...</div>" ) ;
			wdgame.addStatementItem ( data.item , 'P31' , 'Q4167410' , function () {
				wdgame.addStatementItem ( data.item , 'P31' , 'Q202444' , function () { self.setItemStatus(data,'YES') } ) ;
			} ) ;
		} ) ;
		$('#surname').click ( function () {
			self.highlightButton ( $(this).attr('id') ) ;
			$('#main').fadeOut ( wdgame.fade_time , function () { wdgame.showNextScreen() ; } ) ;
			$('#run_status').append ( "<div id='"+data.id+"'>Marking Q"+data.item+" as surname <i>and</i> disambig...</div>" ) ;
			wdgame.addStatementItem ( data.item , 'P31' , 'Q4167410' , function () {
				wdgame.addStatementItem ( data.item , 'P31' , 'Q101352' , function () { self.setItemStatus(data,'YES') } ) ;
			} ) ;
		} ) ;
		$('#both').click ( function () {
			self.highlightButton ( $(this).attr('id') ) ;
			$('#main').fadeOut ( wdgame.fade_time , function () { wdgame.showNextScreen() ; } ) ;
			$('#run_status').append ( "<div id='"+data.id+"'>Marking Q"+data.item+" as given name, surname <i>and</i> disambig...</div>" ) ;
			wdgame.addStatementItem ( data.item , 'P31' , 'Q4167410' , function () {
				wdgame.addStatementItem ( data.item , 'P31' , 'Q101352' , function () {
					wdgame.addStatementItem ( data.item , 'P31' , 'Q202444' , function () { self.setItemStatus(data,'YES') } ) ;
				} ) ;
			} ) ;
		} ) ;
		$('#no_disambig').click ( function () {
			self.highlightButton ( $(this).attr('id') ) ;
			$('#main').fadeOut ( wdgame.fade_time , function () { wdgame.showNextScreen() ; } ) ;
			self.setItemStatus(data,'NO') ;
		} ) ;
		$('#dunno').click ( function () {
			self.highlightButton ( $(this).attr('id') ) ;
			$('#main').fadeOut ( wdgame.fade_time , function () {
				wdgame.showNextScreen() ;
			} ) ;
		} ) ;
	}

} , wdgame_generic ) ;



/********************************************************************************************************************************************
 person
*********************************************************************************************************************************************/

wdgame.modes['person'] = $.extend ( true , {}, {

//	debug:true,
	name : 'Person' ,
	mysql_table : 'potential_people' ,
	loadingMessage : 'Looking for random item that could be a person...' ,
	buttons : ['person','dunno','no_person'] ,
	person_marker : {
		cs : [ /(\s)(básník|fotbalistk?a|histori(?:k|čka)|hokejistk?a|kněz|novinář(?:ka)?|politi(?:k|čka)|publicistk?a|řiditel(?:ka)?|spisovatel(?:ka)?|učitel(?:ka)?)([\s.,:;])/gi ] ,
		de : [ /(\s)((?:fußball|schau)spieler(?:in)?)([\s.,:;])/gi ] ,
		en : [ /(\s)(he|him|she|her|born|died|who)(\s)/gi , // BASIC
		       /(\s)(founder|journalist|judge|lawyer|nurse|officer|politician)([\s.,:;])/gi , // MISCELLANEOUS
		       /(\s)(scholar|teacher)([\s.,:;])/gi , // SCHOOL
		       /(\s)(inventor|scientist)([\s.,:;])/gi , // SCIENCE
		       /(\s)(athlete|boxer|fencer|footballer|(?:football |hockey )?player|referee|runner|tennist)([\s.,:;])/gi , // SPORTS
		       /(\s)(actor|actress|author|architect|director|guitarist|musician|poet|producer|singer|violinist|writer)([\s.,:;])/gi ] , // ARTISTS
		eo : [ /(\s)(li|lia|liaj|liajn|lian|lin|ŝi|ŝia|ŝiaj|ŝiajn|ŝian|ŝin|naskiĝis|mortis)(\s)/gi ] ,
		fy : [ /(\s)(hy|him|sy|har|dy)(\s)/gi , // BASIS
		       /(\s)(oprjochter|sjoernalist|rjochter|advokaat|ferpleger|ferpleechster|ferpleechkundige|agint|amtner|politikus)([\s.,:;])/gi , // FERSKILLENDE
		       /(\s)(gelearde|learaar|dosint|learkrêft)([\s.,:;])/gi , // SKOALLE
		       /(\s)(útfiner|wittenskipper)([\s.,:;])/gi , // WITTENSKIP
		       /(\s)(atleet|sporter|sportman|sportfrou|bokser|skermer|fuotballer|(?:fuotbal|hockey)?spiler|skiedsrjochter|hurdrinner|tennisser)([\s.,:;])/gi , // SPORT
		       /(\s)(akteur|aktrise|arsjitekt|regisseur|gitarist|muzikant|dichter|produsint|sjonger|sjongeres|sjongster|fioelist|skriuwer)([\s.,:;])/gi ] , // ARTYSTEN
		is : [ /(\s)(fædd|fæddur)(\s)/gi ,
			   /(\s)(\w+(?:son|dóttir))(\s)/gi ] ,
		nl : [ /(\s)(hij|hem|zij|haar|geboren|overleden|die)(\s)/gi , // BASIS
		       /(\s)(oprichter|journalist|rechter|advocaat|verpleger|verpleegster|verpleegkundige|agent|ambtenaar|politicus)([\s.,:;])/gi , // DIVERSE
		       /(\s)(geleerde|leraar|lerares|docent|leerkracht)([\s.,:;])/gi , // SCHOOL
		       /(\s)(uitvinder|wetenschapper)([\s.,:;])/gi , // WETENSCHAP
		       /(\s)(atleet|sporter|sportman|sportvrouw|boxer|schermer|voetbal|(?:voetbal|hockey)?speler|scheidsrechter|hardloper|tennisser)([\s.,:;])/gi , // SPORT
		       /(\s)(acteur|actrice|architect|regisseur|gitarist|muzikant|dichter|producent|zanger|zangeres|violist|schrijver)([\s.,:;])/gi ] , // ARTIESTEN
		sk : [ /(\s)(básník|futbalistk?a|hokejistk?a|kňaz|novinár(?:ka)?|poetka|politi(?:k|čka)|publicistk?a|riaditeľ(?:ka)?|spisovateľ(?:ka)?|učiteľ(?:ka)?)([\s.,:;])/gi ] ,
	} ,

	getPageStructure : function ( data ) {
		var self = this ;
		var h = '' ;
		h += "<div>This item has no \"instance of\", and could be a person.</div>" ;
		h += "<div id='data' class='item_container'></div>" ;
		h += "<div class='decision'>" ;
		h += "<div class='btn-group'>" ;
		h += "<button id='person' class='btn btn-success'>Person</button> " ;
		h += "<button id='dunno' class='btn btn-default' accesskey='x'>Not sure</button> " ;
		h += "<button id='no_person' class='btn btn-primary'>Not a person</button> " ;
		h += "</div>" ;
		h += "</div>" ;
		return h ;
	} ,
	showSections : function ( data ) {
		var self = this ;
		wdgame.loadItemSummary ( {q:data.item , target:data.show?'#data':'#nope' , callback:function () {
			self.getAndShow ( false ) ;
			$('div.site_preview_text').each ( function () {
				var o = $(this) ;
				var lang = o.attr('lang') ;
				var t = o.html() ;
				$.each ( (self.person_marker[lang]||[]) , function ( k , v ) {
					t = t.replace ( v , "$1<span class='highlight'>\$2</span>$3" ) ;
				} ) ;
				o.html ( t ) ;
			} ) ;
		} } ) ;
	} ,
	addButtonTriggers : function ( data ) {
		var self = this ;
		$('#person').click ( function () {
			self.highlightButton ( $(this).attr('id') ) ;
			$('#main').fadeOut ( wdgame.fade_time , function () { wdgame.showNextScreen() ; } ) ;
			$('#run_status').append ( "<div id='"+data.id+"'>Marking Q"+data.item+" as person...</div>" ) ;
			wdgame.addStatementItem ( data.item , 'P31' , 'Q5' , function () { self.setItemStatus(data,'YES') } ) ;
		} ) ;
		$('#no_person').click ( function () {
			self.highlightButton ( $(this).attr('id') ) ;
			$('#main').fadeOut ( wdgame.fade_time , function () { wdgame.showNextScreen() ; } ) ;
			self.setItemStatus(data,'NO') ;
		} ) ;
		$('#dunno').click ( function () {
			self.highlightButton ( $(this).attr('id') ) ;
			$('#main').fadeOut ( wdgame.fade_time , function () {
				wdgame.showNextScreen() ;
			} ) ;
		} ) ;
	}

} , wdgame_generic ) ;



/********************************************************************************************************************************************
 no_date
*********************************************************************************************************************************************/

wdgame.modes['no_date'] = $.extend ( true , {}, {

//	debug:true,
	name : 'Date' ,
	mysql_table : 'people_no_date' ,
	loadingMessage : 'Looking for a person item with no/missing dates...' ,
	buttons : ['yes','dunno','no'] ,

	getPageStructure : function ( data ) {
		var self = this ;
		var h = '' ;
		h += "<div>This person has birth and/or death date missing. You can click on highlighted dates in the text to use them, or click the date buttons to enter manually. " ;
		h += "Skip BCE dates and decades/centuries. Click <tt>Accept</tt> when you're ready. Inserted dates use Gregorian calendar.</div>" ;
		h += "<div id='data' class='item_container'></div>" ;
		h += "<div class='decision'>" ;

		h += "<div class='btn-group'" + (!wdgame.is_horizontal?' style="margin-bottom:3px;"':'') + ">" ;
		h += "<button id='birth' class='btn btn-info' title='Click here to edit birth date'>*</button>" ;
		h += "<button id='swap' class='btn btn-default' title='Click here to swap birth and death date'>⇔</button>" ;
		h += "<button id='death' class='btn btn-info' title='Click here to edit death date'>†</button>" ;
		h += "</div>" ;
		h += wdgame.is_horizontal ? '   ' : '<br/>' ;
		h += "<div class='btn-group'>" ;
		h += "<button id='yes' class='btn btn-success'>Accept</button> " ;
		h += "<button id='dunno' class='btn btn-default' accesskey='x'>Not sure</button> " ;
		h += "<button id='no' class='btn btn-primary'>No dates</button> " ;
		h += "</div>" ;
		h += "</div>" ;
		return h ;
	} ,
	done_q : {} ,
	showSections : function ( data ) {
		var self = this ;
		wdgame.loadItemSummary ( {q:data.item , target:data.show?'#data':'#nope' , callback:function () {
			if ( data.show ) {
				var lang = $('div.site_preview_text').attr('lang') ;
				if ( typeof lang == 'undefined' || lang == '' ) return ;
				var h = $('div.site_preview_text').html() ;
				if ( typeof h != 'undefined' && typeof self.done_q[data.item] == 'undefined' ) {
					self.done_q[data.item] = true ;
					h = h.replace ( /\b(\d{3,4})[--–](\d{3,4})\b/ , "\$1 - \$2" ) ; // To recognise dash-separated years

					// Chinese
					r = new RegExp('\\b(\\d{3,4})年(\\d{1,2})月(\\d{1,2})日','g') ;
					h = h.replace ( r , "<span class='highlight' day='\$3' month='\$2' year='\$1'>\$1年<span/>\$2月<span/>\$3日</span>" ) ;
					r = new RegExp('\\b(\\d{3,4})年(\\d{1,2})月','g') ;
					h = h.replace ( r , "<span class='highlight' day='' month='\$2' year='\$1'>\$1年<span/>\$2月</span>" ) ;
					r = new RegExp('\\b(\\d{3,4})年([^<])','g') ;
					h = h.replace ( r , "<span class='highlight' day='' month='' year='\$1'>\$1年</span>\$2" ) ;

//					console.log("HIGHLIGHTING");
					$.each ( (wdgame.months[lang]||{}) , function ( name , num ) {
						// Full name
						var r = new RegExp('\\b(\\d{1,2})\\.{0,1} ('+name+') (\\d{3,4})' ,'gi') ;
						h = h.replace ( r , "<span class='highlight' day='\$1' month='"+num+"' year='\$3'>\$1. \$2 \$3</span>" ) ;
						r = new RegExp('\\b('+name+') (\\d{1,2})t{0,1}h{0,1}\\,{0,1} (\\d{3,4})' ,'gi') ;
						h = h.replace ( r , "<span class='highlight' day='\$2' month='"+num+"' year='\$3'>\$1 \$2, \$3</span>" ) ;
						r = new RegExp('\\b(\\d{1,2}) de ('+name+') de (\\d{3,4})' ,'gi') ;
						h = h.replace ( r , "<span class='highlight' day='\$1' month='"+num+"' year='\$3'>\$1 de \$2 de \$3</span>" ) ;

						// Catalan
						r = new RegExp('\\b(\\d{1,2}) (de |d\')('+name+') (del?) (\\d{3,4})' ,'gi') ;
						h = h.replace ( r , "<span class='highlight' day='\$1' month='"+num+"' year='\$5'>\$1 \$2\$3 \$4 \$5</span>" ) ;

						// Esperanto
						r = new RegExp('\\b(\\d{1,2})-(a|an) de ('+name+') (\\d{3,4})' ,'gi') ;
						h = h.replace ( r , "<span class='highlight' day='\$1' month='"+num+"' year='\$4'>\$1-\$2 de \$3 \$4</span>" ) ;

						// Ido
						r = new RegExp('\\b(\\d{1,2}) di ('+name+') (\\d{3,4})' ,'gi') ;
						h = h.replace ( r , "<span class='highlight' day='\$1' month='"+num+"' year='\$3'>\$1 di \$2 \$3</span>" ) ;

						// French, 1st
						r = new RegExp('\\b1er ('+name+') (\\d{3,4})' ,'gi') ;
						h = h.replace ( r , "<span class='highlight' day='1' month='"+num+"' year='\$2'>1er \$1 \$2</span>" ) ;

						// Italian, 1st
						r = new RegExp('\\b1º ('+name+') (\\d{3,4})' ,'gi') ;
						h = h.replace ( r , "<span class='highlight' day='1' month='"+num+"' year='\$2'>1º \$1 \$2</span>" ) ;

						// Armenian
						r = new RegExp('\\b(\\d{3,4}), ('+name+')ի (\\d{1,2})' ,'gi') ;
						h = h.replace ( r , "<span class='highlight' day='\$3' month='"+num+"' year='\$1'>\$1, \$2ի \$3</span>") ;
						r = new RegExp('('+name+')ի (\\d{1,2}), (\\d{3,4})' ,'gi') ;
						h = h.replace ( r , "<span class='highlight' day='\$2' month='"+num+"' year='\$3'>\$1ի \$2, \$3</span>") ;

						// First three letters
						r = new RegExp('\\b(\\d{1,2})\\.{0,1} ('+name.substr(0,3)+') (\\d{3,4})' ,'gi') ;
						h = h.replace ( r , "<span class='highlight' day='\$1' month='"+num+"' year='\$3'>\$1. \$2 \$3</span>" ) ;
						r = new RegExp('\\b('+name.substr(0,3)+') (\\d{1,2})\\,{0,1} (\\d{3,4})' ,'gi') ;
						h = h.replace ( r , "<span class='highlight' day='\$2' month='"+num+"' year='\$3'>\$1 \$2, \$3</span>" ) ;
						
						// Just month
						r = new RegExp('\\b('+name+') (\\d{3,4})' ,'gi') ;
						h = h.replace ( r , "<span class='highlight' month='"+num+"' year='\$2'>\$1 \$2</span>" ) ;
					} ) ;
					
					for ( var num = 1 ; num <= 12 ; num++ ) {
						// Numbers
						r = new RegExp('\\b(\\d{1,2})/(0{0,1}'+num+')/(\\d{3,4})\\b' ,'gi') ;
						h = h.replace ( r , "<span class='highlight' day='\$1' month='"+num+"' year='\$3'>\$1/\$2/\$3</span>" ) ;
						r = new RegExp('\\b(\\d{3,4})-(0{0,1}'+num+')-(\\d{1,2})\\b' ,'gi') ;
						h = h.replace ( r , "<span class='highlight' day='\$3' month='"+num+"' year='\$1'>\$1/\$2/\$3</span>" ) ;
					}
					
					h = h.replace ( new RegExp('\\b(\\d{3,4})\\b([^\'</-年])','g') , "<span class='highlight' year='$1'>\$1</span>\$2" ) ;

					$('div.site_preview_text').html(h).css({'font-size':'11pt'}) ;
					$('span.highlight').css({border:'1px solid #62A9FF',padding:'1px',margin:'1px',cursor:'pointer'}) ;
					
					self.last_date_set = '' ;
					self.birth = { status:'empty' } ;
					self.death = { status:'empty' } ;
					var q = 'Q'+data.item ;
					if ( wdgame.wd.items[q].hasClaims('P569') ) self.birth.status = 'propSet' ;
					if ( wdgame.wd.items[q].hasClaims('P570') ) self.death.status = 'propSet' ;
					$('span.highlight').click ( function () {
						var o = $(this) ;
						self.setDate ( (o.attr('day')||'') , (o.attr('month')||'') , (o.attr('year')||'') ) ;
					} ) ;
					self.updateDateButton('birth') ;
					self.updateDateButton('death') ;
					$('#swap').click ( function () {
						if ( self.birth.status=='propSet' || self.death.status=='propSet' ) {
							alert ( "One of the dates is already set on Wikidata; can't swap" ) ;
							return ;
						}
						var a = self.birth ;
						self.birth = self.death ;
						self.death = a ;
						self.updateDateButton('birth') ;
						self.updateDateButton('death') ;
					} ) ;
				}
			}
			self.getAndShow ( false ) ;
		} } ) ;
	} ,
	dateButtonClick : function ( which ) {
		var self = this ;
		if ( self[which].status == 'propSet' ) {
			alert ( "This property is already set on Wikidata" ) ;
			return ;
		}

		var h = '' ;
		h += "<table class='table-striped'><tbody>" ;
		h += "<tr><th>Year</th><td><input type='number' id='dialog_year' value='" + (self[which].year||'') + "'/></td></tr>" ;
		h += "<tr><th>Month</th><td><input type='number' id='dialog_month' min='1' max='12' value='" + (self[which].month||'') + "'/> <small>(numeric)</small></td></tr>" ;
		h += "<tr><th>Day</th><td><input type='number' id='dialog_day' min='1' max='31' value='" + (self[which].day||'') + "'/></td></tr>" ;
		h += "</tbody></table>" ;
		h += "<p>Leave unknown fields empty</p>" ;
		
		$('#other_dialog_buttons').html ( "<button id='clear_date' class='btn btn-info'>Clear date</button>" ) ;
		
		$('#dialog h4').html ( "Edit " + which + " date" ) ;
		$('#dialog div.modal-body').html ( h ) ;
		$('#dialog button.btn-primary').unbind('click') ;
		$('#clear_date').click ( function (e) {
			e.preventDefault() ;
			self[which] = { status:'empty' } ;
			$('#dialog').modal('hide') ;
			$('#other_dialog_buttons').html('');
			self.updateDateButton(which) ;
			wdgame.in_dialog = false ;
			return false ;
		} ) ;
		$('#dialog button.btn-primary').unbind('click') ;
		$('#dialog button.btn-primary').click ( function (e) {
			e.preventDefault() ;
			self[which].year = $('#dialog_year').val() ;
			self[which].month = $('#dialog_month').val() ;
			self[which].day = $('#dialog_day').val() ;
			self[which].status = 'set' ;
			if ( self[which].year*1==0 && self[which].month*1==0 && self[which].day*1==0 ) self[which] = { status:'empty' } ;
			$('#dialog').modal('hide') ;
			$('#other_dialog_buttons').html('');
			self.updateDateButton(which) ;
			wdgame.in_dialog = false ;
			return false ;
		} ) ;
		wdgame.in_dialog = true ;
		$('#dialog').modal({show:true,keyboard:true}) ;
	} ,
	updateDateButton : function ( which ) {
		var self = this ;
		$('#'+which).unbind('click') ;
		$('#'+which).click ( function () { self.dateButtonClick(which) } ) ;
		var text = which=='birth'?'*':'†' ;
		text += ' ' ;
		if ( self[which].status == 'empty' ) {
			text += "<b>?</b>" ;
		} else if ( self[which].status == 'propSet' ) {
			text += "SET" ;
			$('#'+which).addClass('btn-danger').removeClass('btn-info') ;
		} else if ( self[which].status == 'set' ) {
			text += self[which].year ;
			if ( self[which].month != '' ) {
				text += '-' + (self[which].month<10?'0':'') + self[which].month ;
				if ( self[which].day != '' ) {
					text += '-' + (self[which].day<10?'0':'') + self[which].day ;
				}
			}
		}
		$('#'+which).html ( text ) ;
		self.sanityCheck() ;
	} ,
	sanityCheck : function () {
		var self = this ;
		if ( self.birth.status != 'set' || self.death.status != 'set' ) return ;
		if ( self.birth.year*1 < self.death.year*1 ) return ; // OK
		if ( self.birth.year*1 == self.death.year*1 && self.birth.month*1 < self.death.month*1 ) return ; // OK
		if ( self.birth.year*1 == self.death.year*1 && self.birth.month*1 == self.death.month*1 && self.birth.day*1 <= self.death.day*1 ) return ; // OK
		$('#swap').click() ; // Auto-swap
	} ,
	setDate : function ( day , month , year ) {
//	console.log ( 'SETTING DATE',year,month,day ) ;
		var self = this ;
		var next = self.last_date_set == '' ? 'birth' : 'death' ;
		if ( self[next].status == 'propSet' ) next = next == 'death' ? 'birth' : 'death' ;
		self[next].day = day ;
		self[next].month = month ;
		self[next].year = year ;
		self[next].status = (day+month+year=='')?'empty':'set' ;
		self.updateDateButton ( next ) ;
		self.last_date_set = next ;
	} ,
	setDateInWikidata : function ( bd , which , q , callback ) {
		var self = this ;
		var year = (bd.year||'')+'' ;
		var month = (bd.month||'')+'' ;
		var day = (bd.day||'')+'' ;
		var prec ; // Precision: 11=YMD, 10=YM, 9=Y
		if ( day == '' && month == '' ) prec = 9 ;
		else if ( day == '' ) prec = 10 ;
		else prec = 11 ;
		while ( year.length < 4 ) year = '0' + year ;
		while ( month.length < 2 ) month = '0' + month ;
		while ( day.length < 2 ) day = '0' + day ;
		var time = "+0000000"+year+"-"+month+"-"+day+"T00:00:00Z" ;
//		console.log ( which , time , prec ) ;
		$.get ( wdgame.widar_api , {
			action:'set_date',
			tool_hashtag:wdgame.tool_hashtag ,
			id:'Q'+q,
			prop:(which=='birth')?'P569':'P570' ,
			date:time,
			prec:prec,
			botmode:1
		} , function ( d ) {
			if ( d.error != 'OK' ) {
				console.log ( d ) ;
				return ;
			}
			callback() ;
		} , 'json' ) ;
	} ,
	addButtonTriggers : function ( data ) {
		var self = this ;
		$('#yes').click ( function () {
			if ( self.birth.status != 'set' && self.death.status != 'set' ) {
				alert ( "No dates set!" ) ;
				return ;
			}
			
			self.highlightButton ( $(this).attr('id') ) ;
			$('#main').fadeOut ( wdgame.fade_time , function () { wdgame.showNextScreen() ; } ) ;
			$('#run_status').append ( "<div id='"+data.id+"'>Setting date(s) for Q"+data.item+"...</div>" ) ;

			function and_then () {
//				console.log ( "DONE" ) ;
				self.setItemStatus(data,'YES') ;
			}
			
			var birth = $.extend ( true , {} , self.birth ) ;
			var death = $.extend ( true , {} , self.death ) ;
			
			if ( birth.status == 'set' ) {
				self.setDateInWikidata ( birth , 'birth' , data.item , function () {
					if ( death.status == 'set' ) {
						self.setDateInWikidata ( death , 'death' , data.item , and_then ) ;
					} else {
						and_then() ;
					}
				} ) ;
			} else {
				self.setDateInWikidata ( death , 'death' , data.item , and_then ) ;
			}
		} ) ;
		$('#no').click ( function () {
			self.highlightButton ( $(this).attr('id') ) ;
			$('#main').fadeOut ( wdgame.fade_time , function () { wdgame.showNextScreen() ; } ) ;
			self.setItemStatus(data,'NO') ;
		} ) ;
		$('#dunno').click ( function () {
			self.highlightButton ( $(this).attr('id') ) ;
			$('#main').fadeOut ( wdgame.fade_time , function () {
				wdgame.showNextScreen() ;
			} ) ;
		} ) ;
	}

} , wdgame_generic ) ;



/********************************************************************************************************************************************
 nationality
*********************************************************************************************************************************************/

wdgame.modes['nationality'] = $.extend ( true , {}, {

//	debug:true,
	name : 'Country of citizenship' ,
	mysql_table : 'potential_nationality' ,
	loadingMessage : 'Looking for a person with birth place but no country of citizenship...' ,
	buttons : ['that_country','dunno','not_that_country'] ,
	mobile_bottom : 150 ,

	getPageStructure : function ( data ) {
		var self = this ;
		var h = '' ;
		h += "<div>This person has a birth place property, but no country of citizenship.</div>" ;

		if ( typeof $.cookie('nationality_warning') == 'undefined' ) {
			h += "<div class='alert alert-warning fade in'>" ;
			h += "<button type='button' class='close' data-dismiss='alert' aria-hidden='true'>×</button>" ;
			h += "<b>Please be careful!</b> The country suggestion is based on the current country on the city this person was born in. The country might have since changed, or didn't even exist. When in doubt, use <tt>Not sure</tt> or <tt>No</tt>!" ;
			h += "</div>" ;
		}

		h += "<div id='data' class='item_container'></div>" ;
		h += "<div class='decision'>" ;
		h += "<div id='nationality' class='lead' style='text-align:center;margin-bottom:2px'><i>Extrapolating country of citizenship...</i></div>" ;
		h += "<div class='btn-group'>" ;
		h += "<button id='that_country' class='btn btn-success'>Yes</button> " ;
		h += "<button id='dunno' class='btn btn-default' accesskey='x'>Not sure</button> " ;
		h += "<button id='not_that_country' class='btn btn-primary'>No</button> " ;
		h += "</div>" ;
		h += "</div>" ;
		return h ;
	} ,
	onAlertClose : function () {
		var self = this ;
		$.cookie('nationality_warning', 'seen', { expires: 3650 });
	} ,
	showSections : function ( data ) {
		var self = this ;
		var alt_nations = {
			'Czech Republic' : ['Czechoslovak'] ,
			'Dominican Republic' : ['Dominican'] ,
			'Finland' : ['Finnish'] ,
			'France' : ['French'] ,
			'Germany' : ['German','Deutsch','Deutsche'] ,
			'Italy' : ['Italian'] ,
			'Netherlands' : ['The Netherlands','Dutch','Netherlandish','Nederland','Nederlands'] ,
			'Norway' : ['Norwegian'] ,
			'Philippines' : ['Filipino','Philippine','Filipina'] ,
			'Portugal' : ['Portuguese'] ,
			'Republic of Ireland' : ['Irish','Ireland'] ,
			'Spain' : ['Spanish'] ,
			'Sweden' : ['Swedish'] ,
			'Turkey' : ['Turkish'] ,
			'Ukraine' : ['Ukrainian'] ,
			'United Kingdom' : ['England','English','British','Scottish','UK'] ,
			'United States of America' : ['U.S.','US','U.S.A.','USA','American','United States'] ,
			"People's Republic of China" : ['China','Chinese']
		}
		var qn = 'Q'+data.nationality ;
		wdgame.loadItemSummary ( {q:data.item , qs:[qn] , target:data.show?'#data':'#nope' , callback:function () {
			var country = wdgame.wd.items[qn].getLabel() ;
			if ( data.show ) {
				$('#nationality').html ( "<b>" + country + "</b>" ) ;
				var h = $('div.site_preview_text').html() ;
				if ( typeof h != 'undefined' ) {
					h = h.replace ( new RegExp('('+country+'[ni]{0,1})','gi') , "<span class='highlight'>\$1</span>" ) ;
					$.each ( (alt_nations[country]||[]) , function ( k , v ) {
						h = h.replace ( new RegExp('\\b('+v+')\\b','gi') , "<span class='highlight'>\$1</span>" ) ;
					} ) ;
					$('div.site_preview_text').html(h) ;
				}
			}
			self.getAndShow ( false ) ;
		} } ) ;
	} ,
	addButtonTriggers : function ( data ) {
		var self = this ;
		$('#that_country').click ( function () {
			self.highlightButton ( $(this).attr('id') ) ;
			$('#main').fadeOut ( wdgame.fade_time , function () { wdgame.showNextScreen() ; } ) ;
			$('#run_status').append ( "<div id='"+data.id+"'>Setting country of citizenship for Q"+data.item+"...</div>" ) ;
			wdgame.addStatementItem ( data.item , 'P27' , 'Q'+data.nationality , function () { self.setItemStatus(data,'YES') } ) ;
		} ) ;
		$('#not_that_country').click ( function () {
			self.highlightButton ( $(this).attr('id') ) ;
			$('#main').fadeOut ( wdgame.fade_time , function () { wdgame.showNextScreen() ; } ) ;
			self.setItemStatus(data,'NO') ;
		} ) ;
		$('#dunno').click ( function () {
			self.highlightButton ( $(this).attr('id') ) ;
			$('#main').fadeOut ( wdgame.fade_time , function () {
				wdgame.showNextScreen() ;
			} ) ;
		} ) ;
	}

} , wdgame_generic ) ;


/********************************************************************************************************************************************
 occupation
*********************************************************************************************************************************************/

wdgame.modes['occupation'] = $.extend ( true , {}, {

//	debug:true,
	name : 'Occupation' ,
	mysql_table : 'potential_occupation' ,
	loadingMessage : 'Looking for a person with no occupation...' ,
	buttons : ['done','dunno','no_occ'] ,
	mobile_bottom : 150 ,
	hard_replace : {
		'Q482980' : 'Q36180' , // Writer
		'Q19546' : '' , // Pope
		'Q121594' : '' , // Professor
		'Q216541' : 'Q378622' // Racing driver
	} ,

	getPageStructure : function ( data ) {
		var self = this ;
		var h = '' ;
		h += "<div>This person has no occupation property. The game offers occupations linked from the Wikipedia articles. If the correct occupation is not offered, click \"not listed\" even if the occupation is in the article text.</div>" ;
/*
		if ( typeof $.cookie('nationality_warning') == 'undefined' ) {
			h += "<div class='alert alert-warning fade in'>" ;
			h += "<button type='button' class='close' data-dismiss='alert' aria-hidden='true'>×</button>" ;
			h += "<b>Please be careful!</b> The country suggestion is based on the current country on the city this person was born in. The country might have since changed, or didn't even exist. When in doubt, use <tt>Not sure</tt> or <tt>No</tt>!" ;
			h += "</div>" ;
		}
*/
		h += "<div id='data' class='item_container'></div>" ;
		h += "<div class='decision'>" ;
		h += "<div id='occupation'></div>" ;
		h += "<div class='btn-group'>" ;
		h += "<button id='done' class='btn btn-success'>Done</button> " ;
		h += "<button id='dunno' class='btn btn-default' accesskey='x'>Not sure</button> " ;
		h += "<button id='no_occ' class='btn btn-primary'>Not listed</button> " ;
		h += "</div>" ;
		h += "</div>" ;
		return h ;
	} ,
	onAlertClose : function () {
		var self = this ;
//		$.cookie('occupation_warning', 'seen', { expires: 3650 });
	} ,
	showSections : function ( data ) {
		var self = this ;
		var occs = [] ;
		$.each ( data.occupation.split(',') , function ( k , v ) {
			var q = 'Q'+v ;
			if ( typeof self.hard_replace[q] != 'undefined' ) q = self.hard_replace[q] ;
			if ( q == '' ) return ;
			if ( -1 != $.inArray ( q , occs ) ) return ;
			occs.push ( q ) ;
		} ) ;
		wdgame.loadItemSummary ( {q:data.item , qs:occs , target:data.show?'#data':'#nope' , callback:function () {
			if ( data.show ) {
				self.occ_candidates = 0 ;
				self.did_set_occ = false ;
				var h = "<div class='btn-group' style='margin-bottom:10px'>" ;
				$.each ( occs , function ( dummy , q ) {
					h += "<button occ='" + q + "' class='btn btn-default btn-large btn-occ'>" ;
					h += wdgame.wd.items[q].getLabel() ;
					h += "</button>" ;
					self.occ_candidates++ ;
				} ) ;
				h += "</div>" ;
				$('#occupation').html ( h ) ;
				
				function setOcc ( o ) {
					var q = o.attr('occ') ;
					var p = 'P106' ;
					var id = data.id + '_' + q ;
					o.off('click');
					$('#run_status').append ( "<div id='"+id+"'>Setting " + o.text() + " as occupation for Q"+data.item+"...</div>" ) ;
					o.html("<div><i>Adding...</i></div>") ;
					
					function setOccWidar () {
						$.get ( wdgame.widar_api , {
							action:'set_claims',
							tool_hashtag:wdgame.tool_hashtag ,
							ids:'Q'+data.item,
							prop:p,
							target:q,
							botmode:1
						} , function ( d ) {
							if ( d.error != 'OK' ) {
								$('#run_status div[id='+id+']').html("Trying again...") ;
								setOccWidar() ;
								return ;
							}
							$('#run_status div[id='+id+']').remove() ;
							o.html("<div><i>ADDED!</i></div>") ;
						} , 'json' ) ;
					}
					
					setOccWidar() ;
				}

				$('#occupation button.btn-occ').click ( function () {
					var o = $(this) ;
//					if ( self.did_set_occ ) setTimeout ( function() { setOcc(o) } , 2000 ) ;
//					else setOcc ( o ) ;
					setOcc ( o ) ;
					self.occ_candidates-- ;
					self.did_set_occ = true ;
					if ( self.occ_candidates == 0 ) $('#done').click() ;
				} ) ;

			}
			self.getAndShow ( false ) ;
		} } ) ;
	} ,
	addButtonTriggers : function ( data ) {
		var self = this ;
		$('#done').click ( function () {
			if ( !self.did_set_occ ) {
				alert ( "No occupation was set!" ) ;
				return ;
			}
			self.highlightButton ( $(this).attr('id') ) ;
			$('#main').fadeOut ( wdgame.fade_time , function () { wdgame.showNextScreen() ; } ) ;
			self.setItemStatus(data,'DONE') ;
//			wdgame.addStatementItem ( data.item , 'P27' , 'Q'+data.nationality , function () { self.setItemStatus(data,'YES') } ) ;
		} ) ;
		$('#no_occ').click ( function () {
			self.highlightButton ( $(this).attr('id') ) ;
			$('#main').fadeOut ( wdgame.fade_time , function () { wdgame.showNextScreen() ; } ) ;
			self.setItemStatus(data,'NO') ;
		} ) ;
		$('#dunno').click ( function () {
			self.highlightButton ( $(this).attr('id') ) ;
			$('#main').fadeOut ( wdgame.fade_time , function () {
				wdgame.showNextScreen() ;
			} ) ;
		} ) ;
	}

} , wdgame_generic ) ;



/********************************************************************************************************************************************
 no_author
*********************************************************************************************************************************************/

wdgame.modes['no_author'] = $.extend ( true , {}, {

//	debug:true,
	name : 'Books without author' ,
	mysql_table : 'potential_author' ,
	loadingMessage : 'Looking for a book with no author...' ,
	buttons : ['done','dunno','no_author'] ,
	mobile_bottom : 150 ,
	hard_replace : {
//		'Q482980' : 'Q36180' , // Writer
//		'Q19546' : '' , // Pope
//		'Q121594' : '' , // Professor
//		'Q216541' : 'Q378622' // Racing driver
	} ,

	getPageStructure : function ( data ) {
		var self = this ;
		var h = '' ;
		h += "<div>This book has no author. The game offers authors linked from the Wikipedia articles. If the correct author is not offered, click \"not listed\" even if the author is in the article text.</div>" ;
/*
		if ( typeof $.cookie('nationality_warning') == 'undefined' ) {
			h += "<div class='alert alert-warning fade in'>" ;
			h += "<button type='button' class='close' data-dismiss='alert' aria-hidden='true'>×</button>" ;
			h += "<b>Please be careful!</b> The country suggestion is based on the current country on the city this person was born in. The country might have since changed, or didn't even exist. When in doubt, use <tt>Not sure</tt> or <tt>No</tt>!" ;
			h += "</div>" ;
		}
*/
		h += "<div id='data' class='item_container'></div>" ;
		h += "<div class='decision'>" ;
		h += "<div id='no_author'></div>" ;
		h += "<div class='btn-group'>" ;
		h += "<button id='done' class='btn btn-success'>Done</button> " ;
		h += "<button id='dunno' class='btn btn-default' accesskey='x'>Not sure</button> " ;
		h += "<button id='no_author2' class='btn btn-primary'>Not listed</button> " ;
		h += "</div>" ;
		h += "</div>" ;
		return h ;
	} ,
	onAlertClose : function () {
		var self = this ;
//		$.cookie('occupation_warning', 'seen', { expires: 3650 });
	} ,
	showSections : function ( data ) {
		var self = this ;
		var authors = [] ;
		$.each ( data.author.split(',') , function ( k , v ) {
			var q = 'Q'+v ;
			if ( typeof self.hard_replace[q] != 'undefined' ) q = self.hard_replace[q] ;
			if ( q == '' ) return ;
			if ( -1 != $.inArray ( q , authors ) ) return ;
			authors.push ( q ) ;
		} ) ;

		wdgame.loadItemSummary ( {q:data.item , qs:authors , target:data.show?'#data':'#nope' , callback:function () {
			if ( data.show ) {
				self.author_candidates = 0 ;
				self.did_set_author = false ;
				var h = "<div class='btn-group' style='margin-bottom:10px'>" ;
				$.each ( authors , function ( dummy , q ) {
					h += "<button author='" + q + "' class='btn btn-default btn-large btn-author'>" ;
					h += wdgame.wd.items[q].getLabel() ;
					h += "</button>" ;
					self.author_candidates++ ;
				} ) ;
				h += "</div>" ;
				$('#no_author').html ( h ) ;
				
				function setAuthor ( o ) {
					var q = o.attr('author') ;
					var p = 'P50' ;
					var id = data.id + '_' + q ;
					o.off('click');
					$('#run_status').append ( "<div id='"+id+"'>Setting " + o.text() + " as author for Q"+data.item+"...</div>" ) ;
					o.html("<div><i>Adding...</i></div>") ;
					
					function setAuthorWidar () {
						$.get ( wdgame.widar_api , {
							action:'set_claims',
							tool_hashtag:wdgame.tool_hashtag ,
							ids:'Q'+data.item,
							prop:p,
							target:q,
							botmode:1
						} , function ( d ) {
							if ( d.error != 'OK' ) {
								$('#run_status div[id='+id+']').html("Trying again...") ;
								setAuthorWidar() ;
								return ;
							}
							$('#run_status div[id='+id+']').remove() ;
							o.html("<div><i>ADDED!</i></div>") ;
						} , 'json' ) ;
					}
					
					setAuthorWidar() ;
				}

				$('#no_author button.btn-author').click ( function () {
					var o = $(this) ;
//					if ( self.did_set_occ ) setTimeout ( function() { setOcc(o) } , 2000 ) ;
//					else setOcc ( o ) ;
					setAuthor ( o ) ;
					self.author_candidates-- ;
					self.did_set_author = true ;
					if ( self.author_candidates == 0 ) $('#done').click() ;
				} ) ;

			}
			self.getAndShow ( false ) ;
		} } ) ;
	} ,
	addButtonTriggers : function ( data ) {
		var self = this ;
		$('#done').click ( function () {
			if ( !self.did_set_author ) {
				alert ( "No author was set!" ) ;
				return ;
			}
			self.highlightButton ( $(this).attr('id') ) ;
			$('#main').fadeOut ( wdgame.fade_time , function () { wdgame.showNextScreen() ; } ) ;
			self.setItemStatus(data,'DONE') ;
//			wdgame.addStatementItem ( data.item , 'P27' , 'Q'+data.nationality , function () { self.setItemStatus(data,'YES') } ) ;
		} ) ;
		$('#no_author2').click ( function () {
			self.highlightButton ( $(this).attr('id') ) ;
			$('#main').fadeOut ( wdgame.fade_time , function () { wdgame.showNextScreen() ; } ) ;
			self.setItemStatus(data,'NO') ;
		} ) ;
		$('#dunno').click ( function () {
			self.highlightButton ( $(this).attr('id') ) ;
			$('#main').fadeOut ( wdgame.fade_time , function () {
				wdgame.showNextScreen() ;
			} ) ;
		} ) ;
	}

} , wdgame_generic ) ;


/********************************************************************************************************************************************
 alma_mater
*********************************************************************************************************************************************/

wdgame.modes['alma_mater'] = $.extend ( true , {}, {

//	debug:true,
	name : 'alma_mater' ,
	mysql_table : 'potential_alma_mater' ,
	loadingMessage : 'Looking for a person with no alma mater...' ,
	buttons : ['done','dunno','no_alma'] ,
	mobile_bottom : 150 ,
	hard_replace : {
//		'Q#####': 'Q#####'
	} ,

	getPageStructure : function ( data ) {
		var self = this ;
		var h = '' ;
		h += "<div>This person has no \"educated at\" (alma mater) property. The game offers universities linked from the Wikipedia articles. If the correct university is not offered, click \"not listed\" even if the university is in the article text.</div>" ;

		if ( typeof $.cookie('alma_mater_warning') == 'undefined' ) {
			h += "<div class='alert alert-warning fade in'>" ;
			h += "<button type='button' class='close' data-dismiss='alert' aria-hidden='true'>×</button>" ;
			h += "<b>Please be careful!</b> This game is to determine where the person was <i>educated</i>, <b>not</b> where he/she worked. When in doubt, use <tt>Not sure</tt>!" ;
			h += "</div>" ;
		}

		h += "<div id='data' class='item_container'></div>" ;
		h += "<div class='decision'>" ;
		h += "<div id='alma_mater'></div>" ;
		h += "<div class='btn-group'>" ;
		h += "<button id='done' class='btn btn-success'>Done</button> " ;
		h += "<button id='dunno' class='btn btn-default' accesskey='x'>Not sure</button> " ;
		h += "<button id='no_alma' class='btn btn-primary'>Not listed</button> " ;
		h += "</div>" ;
		h += "</div>" ;
		return h ;
	} ,
	onAlertClose : function () {
		var self = this ;
		$.cookie('alma_mater_warning', 'seen', { expires: 3650 });
	} ,
	showSections : function ( data ) {
		var self = this ;
		var occs = [] ;
		$.each ( data.alma_mater.split(',') , function ( k , v ) {
			var q = 'Q'+v ;
			if ( typeof self.hard_replace[q] != 'undefined' ) q = self.hard_replace[q] ;
			if ( q == '' ) return ;
			if ( -1 != $.inArray ( q , occs ) ) return ;
			occs.push ( q ) ;
		} ) ;
		wdgame.loadItemSummary ( {q:data.item , qs:occs , target:data.show?'#data':'#nope' , callback:function () {
			if ( data.show ) {
				self.occ_candidates = 0 ;
				self.did_set_occ = false ;
				var h = "<div class='btn-group' style='margin-bottom:10px'>" ;
				$.each ( occs , function ( dummy , q ) {
					h += "<button occ='" + q + "' class='btn btn-default btn-large btn-occ'>" ;
					h += wdgame.wd.items[q].getLabel() ;
					h += "</button>" ;
					self.occ_candidates++ ;
				} ) ;
				h += "</div>" ;
				$('#alma_mater').html ( h ) ;
				
				function setOcc ( o ) {
					var q = o.attr('occ') ;
					var p = 'P69' ;
					var id = data.id + '_' + q ;
					o.off('click');
					$('#run_status').append ( "<div id='"+id+"'>Setting " + o.text() + " as alma_mater for Q"+data.item+"...</div>" ) ;
					o.html("<div><i>Adding...</i></div>") ;
					
					function setOccWidar () {
						$.get ( wdgame.widar_api , {
							action:'set_claims',
							tool_hashtag:wdgame.tool_hashtag ,
							ids:'Q'+data.item,
							prop:p,
							target:q,
							botmode:1
						} , function ( d ) {
							if ( d.error != 'OK' ) {
								$('#run_status div[id='+id+']').html("Trying again...") ;
								setOccWidar() ;
								return ;
							}
							$('#run_status div[id='+id+']').remove() ;
							o.html("<div><i>ADDED!</i></div>") ;
						} , 'json' ) ;
					}
					
					setOccWidar() ;
				}

				$('#alma_mater button.btn-occ').click ( function () {
					var o = $(this) ;
//					if ( self.did_set_occ ) setTimeout ( function() { setOcc(o) } , 2000 ) ;
//					else setOcc ( o ) ;
					setOcc ( o ) ;
					self.occ_candidates-- ;
					self.did_set_occ = true ;
					if ( self.occ_candidates == 0 ) $('#done').click() ;
				} ) ;

			}
			self.getAndShow ( false ) ;
		} } ) ;
	} ,
	addButtonTriggers : function ( data ) {
		var self = this ;
		$('#done').click ( function () {
			if ( !self.did_set_occ ) {
				alert ( "No alma_mater was set!" ) ;
				return ;
			}
			self.highlightButton ( $(this).attr('id') ) ;
			$('#main').fadeOut ( wdgame.fade_time , function () { wdgame.showNextScreen() ; } ) ;
			self.setItemStatus(data,'DONE') ;
//			wdgame.addStatementItem ( data.item , 'P27' , 'Q'+data.nationality , function () { self.setItemStatus(data,'YES') } ) ;
		} ) ;
		$('#no_alma').click ( function () {
			self.highlightButton ( $(this).attr('id') ) ;
			$('#main').fadeOut ( wdgame.fade_time , function () { wdgame.showNextScreen() ; } ) ;
			self.setItemStatus(data,'NO') ;
		} ) ;
		$('#dunno').click ( function () {
			self.highlightButton ( $(this).attr('id') ) ;
			$('#main').fadeOut ( wdgame.fade_time , function () {
				wdgame.showNextScreen() ;
			} ) ;
		} ) ;
	}

} , wdgame_generic ) ;



/********************************************************************************************************************************************
 merge
*********************************************************************************************************************************************/

wdgame.modes['merge'] = $.extend ( true , {} , {

//	debug:true,
	name : 'Merge items' ,
	mysql_table : 'item_pairs' ,
	loadingMessage : 'Looking for random merge candidate pair...' ,
	buttons : ['same','dunno','different'] ,

	getPageStructure : function ( data ) {
		var h = '' ;
		h += "<h3 style='margin-top:0px'>" + data['label'] + "</h3>" ;
		h += "<div><small>These two Wikidata items share this label</small></div>" ;
		
		if ( typeof $.cookie('merge_warning') == 'undefined' ) {
			h += "<div class='alert alert-danger fade in'>" ;
			h += "<button type='button' class='close' data-dismiss='alert' aria-hidden='true'>×</button>" ;
			h += "<b>Please be careful!</b> Merging two items is tough to revert, so please merge only if you are absolutely sure the two items refer to the exact same topic." ;
			h += "</div>" ;
		}
		
		h += "<div id='item2' class='item_container'></div>" ;
		h += "<div class='decision'>" ;
		h += "<div class='btn-group'>" ;
		h += "<button id='same' class='btn btn-success'>Same topic</button> " ;
		h += "<button id='dunno' class='btn btn-default' accesskey='x'>Not sure</button> " ;
		h += "<button id='different' class='btn btn-primary'>Different</button> " ;
		h += "</div>" ;
		h += "</div>" ;
		h += "<div id='item1' class='item_container'></div>" ;
		return h ;
	} ,
	onAlertClose : function () {
		var self = this ;
		$.cookie('merge_warning', 'seen', { expires: 3650 });
	} ,
	showSections : function ( data ) {
		var self = this ;
		var summary_loaded = 0 ;


		
		function summaryLoaded () {
			summary_loaded++ ;
			if ( summary_loaded < 2 ) return ;
			self.getAndShow ( false ) ;
		}
		
		wdgame.loadItemSummary ( {q:data.item1 , target:data.show?'#item1':'#nope' , highlight_label:data.label , callback:summaryLoaded } ) ;
		wdgame.loadItemSummary ( {q:data.item2 , target:data.show?'#item2':'#nope' , highlight_label:data.label , callback:summaryLoaded } ) ;
	} ,
	addButtonTriggers : function ( data ) {
		var self = this ;
		
		$('#same').click ( function () {
			self.highlightButton ( $(this).attr('id') ) ;
			$('#main').fadeOut ( wdgame.fade_time , function () {
				self.doMergeItems ( data ) ;
			} ) ;
		} ) ;
		$('#different').click ( function () {
			self.highlightButton ( $(this).attr('id') ) ;
			$('#main').fadeOut ( wdgame.fade_time , function () {
				self.setItemStatus(data,'DIFF') ;
				wdgame.showNextScreen() ;
			} ) ;
		} ) ;
		$('#dunno').click ( function () {
			self.highlightButton ( $(this).attr('id') ) ;
			$('#main').fadeOut ( wdgame.fade_time , function () {
				wdgame.showNextScreen() ;
			} ) ;
		} ) ;
	} ,
	doMergeItems : function ( data ) {
		var self = this ;
		$('#run_status').append ( "<div id='"+data.id+"'>Merging Q"+data.item2+" into Q"+data.item1+"...</div>" ) ;
		$.get ( wdgame.widar_api , {
			action:'merge_items',
			tool_hashtag:wdgame.tool_hashtag ,
			from:'Q'+data.item2,
			to:'Q'+data.item1,
			botmode:1
		} , function ( d ) {
			if ( d.error != 'OK' ) {
				$('#run_status div[id='+data.id+']').html ( "MERGE FAILED:<br/>"+d.error ) ;
				return ;
			}


			if ( 1 ) { // Create redirect
				$('#run_status div[id='+data.id+']').html ( "Redirecting Q"+data.item2+" to Q"+data.item1 ) ;
				var reason = 'Merged into [[Q'+data.item1+']], via The Game' ;
				var params = {
					action:'create_redirect',
					from:'Q'+data.item2,
					to:'Q'+data.item1,
					tool_hashtag:wdgame.tool_hashtag ,
					botmode:1
				} ;
				$.getJSON ( wdgame.widar_api , params , function ( d2 ) {
					if ( d2.error != 'OK' ) {
						$('#run_status div[id='+data.id+']').html ( "REDIRECT FAILED:<br/>"+d2.error+"<br/>Not trying again." ) ;
						return ;
					}
					self.setItemStatus(data,'SAME') ;
				} ) ;
			} else {
				self.setItemStatus(data,'SAME') ;
			}

			
		} , 'json' ) ;
		wdgame.showNextScreen() ;
	}

} , wdgame_generic ) ;


/********************************************************************************************************************************************
 no_image
*********************************************************************************************************************************************/

wdgame.modes['no_image'] = $.extend ( true , {}, {

//	debug:true,
	name : 'Image' ,
	mysql_table : 'no_image' ,
	loadingMessage : 'Looking for random item that could use an image...' ,
	buttons : ['done','dunno'] ,
	thumbsize : 120 ,
	mobile_bottom : 1 ,
	thumbs_done : {} ,
	props : {
//		Image:18,
		Signature:109,
		'Coat of arms':94,
		Logo:154,
		Flag:41,
		Seal:158,
		'Range map':181,
		'Locator map':242,
		'Grave image':1442,
		'Commemorative plaque':1801,
		Video:10,
		Audio:51,
		Pronounciation:443,
		Voice:990
	} ,
	did_set_file : false,
	file_candidates : 0 ,

	addThumbnails : function ( data ) {
		if ( !data.show ) return ;
		var self = this ;
		if ( typeof self.thumbs_done[data.item] != 'undefined' ) return ;
		self.thumbs_done[data.item] = true ;
		self.did_set_file = false ;
		
		var i = wdgame.wd.items['Q'+data.item] ;

		var bh = '<div>' ;
		bh += "<div class='btn-group mediabuttons'>" ;
		if ( !i.hasClaims('P18') ) bh += "<button class='click2prop btn btn-primary btn-lg' p='18'>Image</button> " ;
		
		bh += '<div class="btn-group">'
		bh += '<button type="button" class="btn btn-info btn-lg dropdown-toggle" data-toggle="dropdown">' ;
		bh += 'Other <span class="caret"></span></button>' ;
		bh += '<ul class="dropdown-menu" role="menu" style="font-size:'+(wdgame.is_horizontal?12:16)+'pt">' ;
		$.each ( self.props , function ( s,p ) {
			if ( p == 10 ) bh += '<li class="divider"></li>' ;
			if ( !i.hasClaims('P'+p) ) bh += "<li><a href='#' class='click2prop' p='"+p+"'>"+s+"</a></li>" ;
		} ) ;
		bh += '</ul></div>' ;
		bh += "</div>" ;
		bh += "</div>" ;

		self.file_candidates = 0 ;
		
		$.each ( data.candidates , function ( k , image ) {
			var div_id = 'image_'+data.item+'_'+k ;
			var mw = parseInt($('#head').width()) - self.thumbsize - 20 ;
			var h = "<div class='thumb_container' id='" + div_id + "'>" ;
			h += "<div class='thumb_img'><i>Loading...</i></div>" ;
			h += "<div class='thumb_desc' style='max-width:"+mw+"px'><div><b>" + image.replace(/_/g,' ') + "</b></div>" ;
			h += "<div class='thumb_desc_commons'><i>Loading...</i></div>" ;
			h += bh ;
			h += "</div>" ;
			h += "</div>" ;
			$('#data').after ( h ) ;
			if ( !wdgame.is_horizontal && k+1 == data.candidates.length ) {
				$('div.thumb_container:last').css({'margin-bottom':'70px'})
			}
			self.file_candidates++ ;
		
			$.getJSON ( '//commons.wikimedia.org/w/api.php?callback=?' , {
				action:'query',
				titles:'File:'+image,
				prop:'imageinfo',
				format:'json',
				iiprop:'url',
				iiurlwidth:self.thumbsize,
				iiurlheight:self.thumbsize
			} , function ( d ) {
				var ii ;
				$.each ( ((d.query||{}).pages||{}) , function ( k , v ) {
					if ( typeof v == 'undefined' ) return ;
					if ( typeof v.imageinfo == 'undefined' ) return ;
					ii = v.imageinfo[0] ;
				} ) ;
				if ( typeof ii == 'undefined' ) { // Something's wrong
					$('#'+div_id+' div.thumb_img').html ( "Problem with image" ) ;
					return ;
				}
				var h = "" ;
				h += "<a target='_blank' href='"+ii.descriptionurl+"'>" ;
				h += "<img border=0 src='" + ii.thumburl + "' />" ;
				h += "</a>" ;
				$('#'+div_id+' div.thumb_img').html ( h ) ;
			} ) ;

			$.getJSON ( '//commons.wikimedia.org/w/api.php?callback=?' , {
				action:'parse',
				page:'File:'+image,
				format:'json'
			} , function ( d ) {
				var nh = $('<div>').append ( $.parseHTML ( d.parse.text['*'] ) ) ;
				var desc = $(nh.find('td.description')) ;
				if ( desc.length == 0 ) desc = '<i>No description or no {{Information}} template</i>' ;
				else desc = desc.html() ;
				var h = '' ;
				h += "<div>" + desc + "</div>" ;
				$('#'+div_id+' div.thumb_desc_commons').html ( h ) ;
				$('#'+div_id+' div.mediabuttons .click2prop').click ( function () {
					self.file_candidates-- ;
					if ( self.file_candidates == 0 ) $('#done').click() ;
					var o = $(this) ;
					var p = o.attr('p') ;
					var id = data.id + '_' + k ;
					$('#run_status').append ( "<div id='"+id+"'>Setting file as P"+p+" for Q"+data.item+"...</div>" ) ;
					$('#'+div_id+' div.mediabuttons').html("<div><i>Adding...</i></div>") ;
					
					function setImageWidar () {
						$.get ( wdgame.widar_api , {
							action:'set_string',
							tool_hashtag:wdgame.tool_hashtag ,
							id:'Q'+data.item,
							prop:'P'+p,
							text:image.replace(/_/g,' '),
							botmode:1
						} , function ( d ) {
							if ( d.error != 'OK' ) {
								$('#'+div_id+' div.mediabuttons').html("Trying again...") ;
								setImageWidar() ;
								return ;
							}
							self.did_set_file = true ;
							$('#run_status div[id='+id+']').remove() ;
							$('#'+div_id+' div.mediabuttons').html("<div><i>ADDED!</i></div>") ;
						} , 'json' ) ;
					}
					
					setImageWidar() ;
					
				} ) ;
			} ) ;

		} ) ;
		
	
	} ,
	getPageStructure : function ( data ) {
		var self = this ;
		var h = '' ;

		if ( typeof $.cookie('image_warning') == 'undefined' ) {
			h += "<div class='alert alert-danger fade in'>" ;
			h += "<button type='button' class='close' data-dismiss='alert' aria-hidden='true'>×</button>" ;
			h += "<b>Please be careful!</b>. Pick only images that show the item subject. Only add more than one image if it is really necessary!" ;
			h += "</div>" ;
		}
		h += "<div>This item has no image, but its Wikipedia articles do. There may also be suitable audio and video files. " ;
		h += "Pick an item or file only if it is appropriate and specific for the item (e.g., a picture <i>of</i> an artist, not one <i>by</i> the artist)! " ;
		h += "Click \"No more images\" if there are no more files to add.</div>" ;
		h += "<div id='data' class='item_container'></div>" ;
		h += "<div class='decision'>" ;
		h += "<div class='btn-group'>" ;
		h += "<button id='done' class='btn btn-primary'>No more images</button> " ;
		h += "<button id='dunno' class='btn btn-default' accesskey='x'>Not sure</button> " ;
		h += "</div>" ;
		h += "</div>" ;
		return h ;
	} ,
	onAlertClose : function () {
		var self = this ;
		$.cookie('image_warning', 'seen', { expires: 3650 });
	} ,
	showSections : function ( data ) {
		var self = this ;
		wdgame.loadItemSummary ( {q:data.item , target:data.show?'#data':'#nope' , callback:function () {
			self.getAndShow ( false ) ;
			self.addThumbnails ( data ) ;
		} } ) ;
		
	} ,
	addButtonTriggers : function ( data ) {
		var self = this ;
		$('#done').click ( function () {
			self.highlightButton ( $(this).attr('id') ) ;
			$('#main').fadeOut ( wdgame.fade_time , function () { wdgame.showNextScreen() ; } ) ;
			$('#run_status').append ( "<div id='"+data.id+"'></div>" ) ;
			if ( self.did_set_file ) {
				self.setItemStatus(data,'YES') ;
			} else {
				self.setItemStatus(data,'NO') ;
			}
		} ) ;
		$('#dunno').click ( function () {
			self.highlightButton ( $(this).attr('id') ) ;
			$('#main').fadeOut ( wdgame.fade_time , function () {
				wdgame.showNextScreen() ;
			} ) ;
		} ) ;
	}

} , wdgame_generic ) ;




/********************************************************************************************************************************************
 no_item TODO
*********************************************************************************************************************************************/

//wdgame.modes['no_item'] = $.extend ( true , {}, {
wdgame.dummy = $.extend ( true , {}, {

//	debug:true,
	name : 'No item' ,
	mysql_table : 'potential_new_pages' ,
	loadingMessage : 'Looking for articles that could use an item...' ,
	buttons : ['person','dunno','no_person'] ,

	getPageStructure : function ( data ) {
		var self = this ;
		var h = '' ;
		h += "<div>This article has no item. Find an existing one, or create a new one.</div>" ;
		h += "<div id='data' class='item_container'></div>" ;
		h += "<div class='decision'>" ;
		h += "<div class='btn-group'>" ;
//		h += "<button id='person' class='btn btn-success'>Person</button> " ;
//		h += "<button id='dunno' class='btn btn-default' accesskey='x'>Not sure</button> " ;
//		h += "<button id='no_person' class='btn btn-primary'>Not a person</button> " ;
		h += "</div>" ;
		h += "</div>" ;
		return h ;
	} ,
	showSections : function ( data ) {
		var self = this ;
/*		wdgame.loadItemSummary ( {q:data.item , target:data.show?'#data':'#nope' , callback:function () {
			self.getAndShow ( false ) ;
		} } ) ;*/
	} ,
	addButtonTriggers : function ( data ) {
		var self = this ;
/*		$('#person').click ( function () {
			self.highlightButton ( $(this).attr('id') ) ;
			$('#main').fadeOut ( wdgame.fade_time , function () { wdgame.showNextScreen() ; } ) ;
			$('#run_status').append ( "<div id='"+data.id+"'>Marking Q"+data.item+" as person...</div>" ) ;
			wdgame.addStatementItem ( data.item , 'P31' , 'Q5' , function () { self.setItemStatus(data,'YES') } ) ;
		} ) ;
		$('#no_person').click ( function () {
			self.highlightButton ( $(this).attr('id') ) ;
			$('#main').fadeOut ( wdgame.fade_time , function () { wdgame.showNextScreen() ; } ) ;
			self.setItemStatus(data,'NO') ;
		} ) ;
		$('#dunno').click ( function () {
			self.highlightButton ( $(this).attr('id') ) ;
			$('#main').fadeOut ( wdgame.fade_time , function () {
				wdgame.showNextScreen() ;
			} ) ;
		} ) ;*/
	}

} , wdgame_generic ) ;


/********************************************************************************************************************************************
 commonscat
*********************************************************************************************************************************************/

wdgame.modes['commonscat'] = $.extend ( true , {}, {

//	debug:true,
	name : 'Commons category' ,
	mysql_table : 'potential_commonscat' ,
	loadingMessage : 'Looking for random item that could use an image...' ,
	buttons : ['cat','dunno','nocat'] ,
	mobile_bottom : 1 ,

	addThumbnails : function ( data ) {
		if ( !data.show ) return ;
		var self = this ;
		
		var i = wdgame.wd.items['Q'+data.item] ;
		
		var url1 = "//commons.wikimedia.org/wiki/Category:"+encodeURIComponent(data.commonscat).replace(/'/g, "&#39;") ;
		var url2 = "//commons.m.wikimedia.org/wiki/Category:"+encodeURIComponent(data.commonscat).replace(/'/g, "&#39;") ;

		var h = "<div class='lead'>Commons category candidate:<br/>" ;
		h += "<a href='"+url1+"' target='_blank'>" + data.commonscat.replace(/_/g,' ') + "</a></div>" ;
		
		h += "<div style='margin-bottom:60px;border-top:3px solid #DDD'>" ;
		h += "<iframe style='width:100%;height:300px;' src='" + url1 + "#mw-category-media'></iframe>" ;
		h += "</div>" ;
		$('#data').after ( h ) ;
	} ,
	getPageStructure : function ( data ) {
		var self = this ;
		var h = '' ;

		if ( typeof $.cookie('commonscat_warning') == 'undefined' ) {
			h += "<div class='alert alert-danger fade in'>" ;
			h += "<button type='button' class='close' data-dismiss='alert' aria-hidden='true'>×</button>" ;
			h += "<b>Please be careful!</b>. Only assign a Commons category if you are really sure it is the correct one!" ;
			h += "</div>" ;
		}
		h += "<div>This item has no Commons category assigned, but there is one with the exact same name. Is this category about the item? " ;
		h += "Click \"No category\" if this is not the category you are looking for!</div>" ;
		h += "<div id='data' class='item_container'></div>" ;
		h += "<div class='decision'>" ;
		h += "<div class='btn-group'>" ;
		h += "<button id='cat' class='btn btn-success'>Category</button> " ;
		h += "<button id='dunno' class='btn btn-default' accesskey='x'>Not sure</button> " ;
		h += "<button id='nocat' class='btn btn-primary'>No category</button> " ;
		h += "</div>" ;
		h += "</div>" ;
		return h ;
	} ,
	onAlertClose : function () {
		var self = this ;
		$.cookie('commonscat_warning', 'seen', { expires: 3650 });
	} ,
	showSections : function ( data ) {
		var self = this ;
//		console.log ( data ) ;
		wdgame.loadItemSummary ( {q:data.item , target:data.show?'#data':'#nope' , callback:function () {
			self.getAndShow ( false ) ;
			self.addThumbnails ( data ) ;
		} } ) ;
		
	} ,
	addButtonTriggers : function ( data ) {
		var self = this ;
		$('#cat').click ( function () {
			self.highlightButton ( $(this).attr('id') ) ;
			$('#main').fadeOut ( wdgame.fade_time , function () { wdgame.showNextScreen() ; } ) ;
			$('#run_status').append ( "<div id='"+data.id+"'>Adding category to Q"+data.item+"</div>" ) ;
			wdgame.addStatementString ( data.item , 'P373' , data.commonscat.replace(/_/g,' ') , function () { self.setItemStatus(data,'YES') } ) ;
		} ) ;
		$('#nocat').click ( function () {
			self.highlightButton ( $(this).attr('id') ) ;
			$('#main').fadeOut ( wdgame.fade_time , function () { wdgame.showNextScreen() ; } ) ;
			self.setItemStatus(data,'NO') ;
		} ) ;
		$('#dunno').click ( function () {
			self.highlightButton ( $(this).attr('id') ) ;
			$('#main').fadeOut ( wdgame.fade_time , function () {
				wdgame.showNextScreen() ;
			} ) ;
		} ) ;
	}

} , wdgame_generic ) ;



/********************************************************************************************************************************************
 startup
*********************************************************************************************************************************************/

$(document).ready ( function () {
	wdgame.init() ;
} ) ;