# Game API
To add your game, you need to provide a simple API that can respond to queries in the way detailed below. Requirements include:
* Reachable through https
* Returns JSONP, using the **callback** parameter as a function name

Once your API is up-and-running, you can test it in the game, and eventually add it permanently, by providing the API URL. You can host multiple games on the same API, by adding a default parameter to the URL, like _...api.php?mode=blah_.

Check out _demo/api.php_ for a very simple example (returning random Wikidata items).

## Game description
Your API has to be able to generate a game description as JSON, via the
>**action=desc&callback=xyz**

parameters. The description will be queried on testing, on the initial addition of the game, on manual updates, and once a day automatically. Example JSONP:
```
xyz( {
    "label":{ "en":"Test game" },
    "description":{ "en":"This is a test. There are many others like it, but this one is mine." },
    "icon":"https://path.to/some/icon/120px.png"
} )
```
A label and a short description in English are mandatory; both will be displayed as plain text. An icon, as a bitmap (JPG/PNG) file with 120 pixels on the longer side, is recommended.
Your game will be automatically deactivated if it fails to provide a proper JSON description; it will be re-enables once it does.

## Game tiles
Your API has to be able to generate _game tiles_, individual game items to play. An API call would look like this:
>**action=tiles&num=1&lang=en&callback=xyz**

The API should then return an object with a **tiles** array of **num** objects. Example JSONP:
```
xyz( {
    "tiles" : [
    {
        "id": 114600654,
        "sections": [ { "type": "item", "q": "Q42" } ],
        "controls": [
            {
                "type": "buttons",
                "entries": [
                    {
                        "type": "green",
                        "decision": "yes",
                        "label": "Is source",
                        "api_action": {
                            "action": "wbcreateclaim",
                            "entity": "Q4115189",
                            "property": "P1343",
                            "snaktype": "value",
                            "value": "{\"entity-type\":\"item\",\"numeric-id\":42}"
                        }
                    },
                    { "type": "white", "decision": "skip", "label": "Dunno" },
                    { "type": "blue", "decision": "no", "label": "Nope" }
                ]
            }
        ]
    }
] } )
```

* **id** is the internal ID of the tile in your game
* **sections** is an array of sections to display in the tile
* **controls** is an array of control groups (e.g. buttons) to display at the end of the tile, or the bottom of the screen on mobile

You can also (optionally!) set **low=1** if your game is running low on tiles. This will alert the user to play a different game for a while.

### Sections
Each section has a **type**, and data appropriate for that type. Supported types are:
#### item
Shows a Wikidata item. Parameters:

* **q** as the item ID

#### text
This will display plain text. Parameters are:

* **title** as the title of the section, optionally linked to a URL
* **url** as the URL to link the title to (optional)
* **text** as the plain text to be displayed (newlines \n will be converted to <br/>)

#### wikipage
This will show a wiki page intro. Parameters are:

* **title** as the title of the wiki page
* **wiki** as the wiki to use (e.g. _enwiki_)

### Controls
Each control group has a **type**, and data appropriate for that type. Supported types are:
#### buttons
Has an array of buttons as **entries**. Each button has

* a **type**, green (_yes_ or _perform action_), white (_skip_), blue (_no_ or _no action on this tile_), or yellow (no specific meaning).
* a **decision**. This string will be passed back to your feedback API (see below). The decision _skip_ has a special meaning.
* a **label** for the button in the language passed as the **lang** parameter, with English as a fallback
* a **shortcut** letter for a keyboard key to trigger this button. Keys 1-3 are reserved, and automatically assigned byt _decision_ (yes=1,skip=2,no=3)
* an **api_action**. This object holds the key-value-pairs to pass to the [Wikidata API](https://www.wikidata.org/w/api.php). Note that all values _must_ be strings, even if they contain JSON, e.g. for [wbcreateclaim](https://www.wikidata.org/w/api.php?action=help&modules=wbcreateclaim)

## Feedback
When the user acts on a control (e.g. presses a button), three things happen:

* The action is stored in the central game hub
* Actions are performed on the Wikidata API
* Your game API gets a notification of the action. It should, at the very least, tag the tile as "done", and not expose it as a playable tile again. Beyond that, no action or reply is required.

Parameters passed via GET to your API are:

* **action=log_action**
* **user=USERNAME** The Wikidata user name of the user performing the action
* **tile=NUMBER** The ID number your API gave that tile
* **decision=STRING** The decision the user made, as given by your API in the _controls_ data

Note that the feedback API will _not_ be called for **decision=skip**, which is just a decision not to decide about the tile at this moment.