<?php

header('Content-Type: application/json');

$jsonFile = __DIR__ . '/db.json';
$imgPath = __DIR__ . "/images/";
$publicImgPath = "images/";

if (!file_exists($jsonFile)) {
    echo json_encode(["error" => "db.json introuvable"]);
    exit;
}

$data = json_decode(file_get_contents($jsonFile), true);

if (!$data || count($data) < 2) {
    echo json_encode(["error" => "Pas assez de données"]);
    exit;
}

// Inputs (pas encore utilisés mais prêts pour après)
$idClicked = $_POST['id_clicked'] ?? null;
$idOther   = $_POST['id_other'] ?? null;

// Fonction reroll
function rerollImages($data, $id1, $id2) {

    if (count($data) < 2) {
        return null;
    }

    $maxAttempts = 10;
    $attempt = 0;

    do {
        $randomKeys = array_rand($data, 2);

        $item1 = $data[$randomKeys[0]];
        $item2 = $data[$randomKeys[1]];

        $attempt++;

    } while ((
        $item1['id'] === $item2['id'] ||
        ($item1['id'] === $id1 && $item2['id'] === $id2) ||
        ($item2['id'] === $id1 && $item1['id'] === $id2)
    )  && $attempt < $maxAttempts);

    return [$item1, $item2];
}


[$item1, $item2] = rerollImages($data, $idClicked, $idOther);

// Fonction image
function findImage($id, $imgPath, $publicImgPath) {

    if (file_exists($imgPath . $id . ".jpg")) {
        return $publicImgPath . $id . ".jpg";
    }
    if (file_exists($imgPath . $id . ".png")) {
        return $publicImgPath . $id . ".png";
    }

    return null;
}

echo json_encode([
    "item1" => [
        "id" => $item1["id"],
        "name" => $item1["name"],
        "image" => findImage($item1["imageId"], $imgPath, $publicImgPath)
    ],
    "item2" => [
        "id" => $item2["id"],
        "name" => $item2["name"],
        "image" => findImage($item2["imageId"], $imgPath, $publicImgPath)
    ]
]);
