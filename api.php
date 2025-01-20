<?php
require_once('config.php');

header('Content-Type: application/json');

try {
    if (!isset($_GET['action'])) {
        throw new Exception('No action specified.');
    }

    if ($_GET['action'] === 'getTask') {
        // Simulated task data (replace with actual API call logic)
        $task = [
            'task' => 'Verify if Q4115189 has property P710 set to Q6601875 or Q495299.'
        ];
        echo json_encode($task);
    } else {
        throw new Exception('Invalid action specified.');
    }
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>