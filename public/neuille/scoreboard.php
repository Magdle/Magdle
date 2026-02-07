<?php

$jsonFile = __DIR__ . '/db.json';

if (!file_exists($jsonFile)) {
    die("db.json introuvable");
}

$data = json_decode(file_get_contents($jsonFile), true);

if (!$data) {
    die("Erreur lecture JSON");
}

// Initialiser Elo si absent
foreach ($data as &$item) {
    if (!isset($item["elo"])) {
        $item["elo"] = 1000;
    }
}
unset($item);

// Tri par Elo décroissant
usort($data, function($a, $b) {
    return $b["elo"] <=> $a["elo"];
});
?>

<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Scoreboard</title>
    <link rel="stylesheet" href="style.css">
</head>

<body>

<div class="top-nav">
    <a class="home-link" href="/">← Retour à Magdle</a>
</div>

<h1>Classement de Neuillitude</h1>

<table>
    <tr>
        <th>#</th>
        <th>Nom</th>
        <th>Neuillitude</th>
        <th>Elo</th>
    </tr>

    <?php
    $rank = 1;

    foreach ($data as $item):

        // Classe CSS podium
        $rankClass = "";
        if ($rank == 1) $rankClass = "rank-1";
        elseif ($rank == 2) $rankClass = "rank-2";
        elseif ($rank == 3) $rankClass = "rank-3";
        ?>

        <tr class="<?php echo $rankClass; ?>">
            <td><?php echo $rank; ?></td>
            <td><?php echo htmlspecialchars($item["name"]); ?></td>
            <td><?php echo $item["neuillitude"];; ?></td>
            <td><?php echo $item["elo"]; ?></td>
        </tr>

        <?php
        $rank++;
    endforeach;
    ?>

</table>

<div class="back">
    <button onclick="window.location.href='index.php'">
        ⬅ Retour
    </button>
</div>

</body>
</html>
