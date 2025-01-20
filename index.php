<?php
require_once('config.php');
require_once('api.php');

// Main entry point
echo "<!DOCTYPE html>
<html lang='en'>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>Distributed Wikidata Game</title>
    <link rel='stylesheet' href='style.css'>
</head>
<body>
    <h1>Distributed Wikidata Game</h1>
    <div id='task-container'></div>
    <button id='submit-button'>Submit</button>
    <script src='script.js'></script>
</body>
</html>";
?>