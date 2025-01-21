'use strict';

let router ;
let app ;
let wd = new WikiData() ;
let games = {} ;
let user_settings = { language:[] , loaded:false } ;
let game_path = '/distributed' ;
let api_url = game_path+'/api.php' ;
var widar_api_url = api_url ;
let media_props = { 'photo':[] , 'map':[] , 'diagram':[] , 'audio':[] , 'video':[] , 'other':[] } ;

function load_user_settings() {
    if ( typeof widar == 'undefined' ) {
        return setTimeout ( load_user_settings , 100 ) ;
    }
    widar.maximum_number_of_tries = 3 ;
    widar.tool_hashtag = 'distributed-game' ;
    if ( !widar.loaded ) {
        return setTimeout ( load_user_settings , 100 ) ;
    }
    if ( widar.is_logged_in ) {
        $.get ( api_url , {
            action:'get_user_settings',
            user:widar.getUserName()
        } , function ( d ) {
            user_settings = d.user_settings ;
            user_settings.loaded = true ;
        } );
    } else {
        user_settings = { languages:['en'] , loaded:true } ;
    }

}

function load_media_properties(resolve,reject) {
    let sparql = 'SELECT ?property ?propertyLabel WHERE { ?property wikibase:propertyType wikibase:CommonsMedia . SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". } }' ;
    wd.loadSPARQL ( sparql , function ( json ) {
        let group2hint = {
            'diagram' : /\b(logo|seal|flag|emblem|sign|arms|structure|symbol|icon|diagram|plan|bathymetry)\b/ ,
            'map' : /\bmap\b/ ,
            'photo' : /\b(image|banner|view)\b/ ,
            'video' : /\bvideo\b/ ,
            'audio' : /\baudio\b/ ,
        }
        let props2load = ["P18"] ;
        $.each ( json.results.bindings , function ( dummy , b ) {
            let label = b.propertyLabel.value ;
            let p = wd.itemFromBinding ( b.property ) ;
            p = p.replace(/\D/g,'') ;
            if ( p == 18 || p == 368 || p == 369 || p == 6685 ) return ; // Special cases
            props2load.push('P'+p);
            let to_group = 'other' ;
            $.each ( group2hint , function ( group , hint ) {
                if ( !hint.test(label) ) return ;
                to_group = group ;
                return false ;
            } ) ;
            media_props[to_group].push ( { p:'P'+p.replace(/\D/g,'') , label:label } ) ;
        } ) ;
        $.each ( media_props , function ( group , props ) {
            props.sort ( function ( a , b ) {
                return (a.label.toLowerCase()>b.label.toLowerCase())?1:-1 ;
            } ) ;
        } ) ;
        wd.getItemBatch ( props2load , resolve ) ;
    } ) ;
}

$(document).ready ( function () {
    vue_components.toolname = 'wikidata_games' ;
//    vue_components.components_base_url = 'https://tools.wmflabs.org/magnustools/resources/vue/' ; // For testing; turn off to use tools-static
    Promise.all ( [
        vue_components.loadComponents ( ['widar','wd-date','wd-link','tool-translate','tool-navbar','commons-thumbnail','autodesc',
            'vue_components/mixins.html',
            'vue_components/main_page.html',
            'vue_components/game.html',
            'vue_components/game_entry.html',
            'vue_components/game_tile.html',
            "vue_components/tile_section_item.html",
            "vue_components/tile_section_wikipage.html",
            "vue_components/tile_section_files.html",
            "vue_components/wiki_preview.html",
            'vue_components/map_preview.html',
            'vue_components/map_section.html',
            'vue_components/controls.html',
            ] ) ,
        new Promise(function(resolve, reject) {
            $.get ( game_path+'/games.json' , function ( d ) {
                games = d ;
                resolve() ;
            } , 'json' ) ;
        } ) ,
        new Promise(load_media_properties)
    ] ) .then ( () => {
        wd_link_wd = wd ;
        load_user_settings() ;

        $(window).keypress ( function (e) {
            if ( typeof e.key == 'undefined' ) e.key = String.fromCharCode ( e.charCode ? e.charCode : e.keyCode ? e.keyCode : 0 ) ;
            $('#control_button_'+e.key).click();
        } ) ;

        const routes = [
            { path: '/', component: MainPage , props:true },
            { path: '/game/:game_id', component: Game , props:true },
            { path: '/game/:game_id/:initial_options', component: Game , props:true },
        ] ;
        router = new VueRouter({routes}) ;
        app = new Vue ( { router } ) .$mount('#app') ;
    } ) ;
} ) ;
