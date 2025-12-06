<?php
header('Content-Type: application/json');
echo json_encode(['status' => 'working', 'method' => $_SERVER['REQUEST_METHOD'] ?? 'unknown']);
