<?php
require_once('config.php');

if ($_GET['action'] === 'getTask') {
    // Simulated task data (replace with actual API call logic)
    $task = [
        'task' => 'Verify if Q4115189 has property P710 set to Q6601875 or Q495299.'
    ];
    header('Content-Type: application/json');
    echo json_encode($task);
}
?>