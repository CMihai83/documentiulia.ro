<?php
header('Content-Type: application/json');
echo json_encode(['working' => true, 'path' => __FILE__]);
