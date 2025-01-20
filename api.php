<?php
header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? null;
$callback = $_GET['callback'] ?? '';

if ($action === 'desc') {
    // Game description
    $description = [
        "label" => ["en" => "Team Validation Game"],
        "description" => ["en" => "Validate if an item belongs to a specific team."],
        "icon" => "https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Wikidata-logo.svg/120px-Wikidata-logo.svg.png"
    ];
    echo $callback ? $callback . '(' . json_encode($description) . ')' : json_encode($description);

} elseif ($action === 'tiles') {
    // Game tiles
    $num = intval($_GET['num'] ?? 1);
    $tiles = [
        "tiles" => []
    ];

    for ($i = 1; $i <= $num; $i++) {
        $tiles["tiles"][] = [
            "id" => $i,
            "sections" => [
                ["type" => "item", "q" => "Q42"]
            ],
            "controls" => [
                [
                    "type" => "buttons",
                    "entries" => [
                        [
                            "type" => "green",
                            "decision" => "yes",
                            "label" => "Yes",
                            "api_action" => [
                                "action" => "wbcreateclaim",
                                "entity" => "Q42",
                                "property" => "P710",
                                "snaktype" => "value",
                                "value" => "{"entity-type":"item","numeric-id":1}"
                            ]
                        ],
                        ["type" => "white", "decision" => "skip", "label" => "Skip"],
                        ["type" => "blue", "decision" => "no", "label" => "No"]
                    ]
                ]
            ]
        ];
    }
    echo $callback ? $callback . '(' . json_encode($tiles) . ')' : json_encode($tiles);

} elseif ($action === 'log_action') {
    // Log user action
    $user = $_GET['user'] ?? 'Anonymous';
    $tile = $_GET['tile'] ?? '';
    $decision = $_GET['decision'] ?? '';
    // Log action (this is just a placeholder; real implementation would store this in a database)
    error_log("User $user made decision '$decision' on tile $tile");
    echo json_encode(["success" => true]);

} else {
    // Invalid action
    echo json_encode(["error"] => "Invalid action"]);
}
?>