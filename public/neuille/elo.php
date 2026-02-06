<?php
header('Content-Type: application/json');

$jsonFile = __DIR__ . '/db.json';

if (!file_exists($jsonFile)) {
    echo json_encode(["error" => "db.json introuvable"]);
    exit;
}

$data = json_decode(file_get_contents($jsonFile), true);

// Inputs (pas encore utilisés mais prêts pour après)
$idClicked = $_POST['id_clicked'] ?? null;
$idOther   = $_POST['id_other'] ?? null;
$draw      = $_POST['draw'] ?? null;

if (!$idClicked || !$idOther) {
    echo json_encode(["error" => "IDs manquants"]);
    exit;
}

// Récupération joueurs
foreach ($data as &$item) {
    if ($item["id"] == $idClicked) {
        $winnerIndex = array_search($item, $data);
        $winner = &$item;
    }

    if ($item["id"] == $idOther) {
        $loserIndex = array_search($item, $data);
        $loser = &$item;
    }
}

if (!isset($winner) || !isset($loser)) {
    echo json_encode(["error" => "Joueurs introuvables"]);
    exit;
}

// Initialisation Elo si absent
$defaultElo = 1000;

if (!isset($winner["elo"]))
    $winner["elo"] = $defaultElo;

if (!isset($loser["elo"]))
    $loser["elo"] = $defaultElo;

// Elo actuels
$eloWinner = $winner["elo"];
$eloLoser  = $loser["elo"];

// Paramètre K
$K = 32;

// Expected scores
    $expectedWinner = 1 / (1 + pow(10, ($eloLoser - $eloWinner) / 400));
    $expectedLoser = 1 / (1 + pow(10, ($eloWinner - $eloLoser) / 400));

// Nouveaux Elos
if (!$draw) {
    $newWinnerElo = $eloWinner + $K * (1 - $expectedWinner);
    $newLoserElo  = $eloLoser  + $K * (0 - $expectedLoser);
} else {
    $newWinnerElo = $eloWinner + $K * (0.5 - $expectedWinner);
    $newLoserElo  = $eloLoser  + $K * (0.5 - $expectedLoser);
}

// Arrondi (optionnel mais conseillé)
$newWinnerElo = round($newWinnerElo);
$newLoserElo  = round($newLoserElo);

// Mise à jour JSON
$winner["elo"] = $newWinnerElo;
$loser["elo"]  = $newLoserElo;

// Sauvegarde fichier
file_put_contents(
    $jsonFile,
    json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
);

// Réponse JSON
echo json_encode([
    "winner" => [
        "id" => $winner["id"],
        "old_elo" => $eloWinner,
        "new_elo" => $newWinnerElo
    ],
    "loser" => [
        "id" => $loser["id"],
        "old_elo" => $eloLoser,
        "new_elo" => $newLoserElo
    ]
]);

?>
