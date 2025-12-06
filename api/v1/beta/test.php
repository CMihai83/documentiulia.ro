<?php
header('Content-Type: application/json');
echo json_encode(['working' => true, 'directory' => __DIR__]);
