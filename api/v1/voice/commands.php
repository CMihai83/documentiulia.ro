<?php
/**
 * Voice Commands API
 * Returns available voice commands in Romanian
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$commands = [
    'navigation' => [
        [
            'pattern' => 'du-mă la {pagină}',
            'examples' => [
                'du-mă la facturi',
                'mergi la cheltuieli',
                'deschide contacte',
                'deschide rapoarte',
                'du-mă la inventar',
                'deschide proiecte',
                'du-mă la panou',
            ],
            'description' => 'Navighează la o pagină specifică',
        ],
    ],
    'create' => [
        [
            'pattern' => 'creează {document}',
            'examples' => [
                'creează factură nouă',
                'adaugă cheltuială nouă',
                'fă contact nou',
                'creează proiect nou',
            ],
            'description' => 'Creează un document nou',
        ],
    ],
    'search' => [
        [
            'pattern' => 'caută {text}',
            'examples' => [
                'caută SC Example SRL',
                'găsește factura 123',
            ],
            'description' => 'Caută în aplicație',
        ],
    ],
    'reports' => [
        [
            'pattern' => 'arată raportul de {tip}',
            'examples' => [
                'arată raportul de vânzări',
                'afișează raportul de profit',
                'arată raportul de TVA',
            ],
            'description' => 'Afișează un raport specific',
        ],
    ],
    'amounts' => [
        [
            'pattern' => '{sumă} lei',
            'examples' => [
                '150 lei',
                '2500,50 lei',
            ],
            'description' => 'Dictează o sumă (în formulare)',
        ],
    ],
];

$tips = [
    'Vorbiți clar și natural',
    'Așteptați sunetul de activare înainte de a vorbi',
    'Puteți folosi sinonime (mergi/du-mă/deschide)',
    'Pentru sume, spuneți numerele urmate de "lei"',
];

$response = [
    'success' => true,
    'data' => [
        'language' => 'ro-RO',
        'commands' => $commands,
        'tips' => $tips,
        'browser_support' => [
            'chrome' => 'Suport complet',
            'edge' => 'Suport complet',
            'safari' => 'Suport parțial',
            'firefox' => 'Nu este suportat',
        ],
    ],
];

echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
