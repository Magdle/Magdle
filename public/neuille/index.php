<?php
// Chemin vers le JSON
$jsonFile = __DIR__ . '/db.json';

// Vérifie que le fichier existe
if (!file_exists($jsonFile)) {
    die("Fichier db.json introuvable.");
}

// Lecture et décodage JSON
$data = json_decode(file_get_contents($jsonFile), true);

if (!$data || count($data) < 2) {
    die("Pas assez d'entrées dans le JSON.");
}

// Sélection de 2 entrées aléatoires distinctes
$randomKeys = array_rand($data, 2);

$item1 = $data[$randomKeys[0]];
$item2 = $data[$randomKeys[1]];

// Fonction pour trouver l'image (jpg ou png)
function findImage($id) {
    $basePath = __DIR__ . "/images/";
    $publicPath = "images/";

    if (file_exists($basePath . $id . ".jpg")) {
        return $publicPath . $id . ".jpg";
    }
    if (file_exists($basePath . $id . ".png")) {
        return $publicPath . $id . ".png";
    }

    return null; // Image non trouvée
}

$image1 = findImage($item1["imageId"]);
$image2 = findImage($item2["imageId"]);

function rerollImages($data, $excludeIds = []) {
    // Filtrer les entrées pour éviter de reprendre les mêmes si souhaité
    if (!empty($excludeIds)) {
        $data = array_filter($data, function($item) use ($excludeIds) {
            return !in_array($item['id'], $excludeIds);
        });
        $data = array_values($data); // Réindexer
    }

    if (count($data) < 2) {
        die("Pas assez d'éléments pour reroll.");
    }

    $randomKeys = array_rand($data, 2);

    return [
        $data[$randomKeys[0]],
        $data[$randomKeys[1]]
    ];
}

?>

<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Neuille VS</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>

<div class="top-nav">
    <a class="home-link" href="/">← Retour à Magdle</a>
</div>

<h1>Qui est le plus neuille ?</h1>

<div class="container">
        <button onclick="vote('<?php echo $item1['id']; ?>', '<?php echo $item2['id']; ?>')">
            <img id="img1" src="<?php echo $image1; ?>">
            <div id="name1" class="name"><?php echo $item1['name']; ?></div>
        </button>

        <button onclick="vote('<?php echo $item2['id']; ?>', '<?php echo $item1['id']; ?>')">
            <img id="img2" src="<?php echo $image2; ?>">
            <div id="name2" class="name"><?php echo $item2['name']; ?></div>
        </button>
</div>

<div class="container">
    <!-- Boutons secondaires -->
    <div class="actions">

        <button class="secondary draw" onclick="draw('<?php echo $item1['id']; ?>', '<?php echo $item2['id']; ?>')">
            Égalité
        </button>

        <button class="secondary" onclick="reroll()">
            Sans avis
        </button>
    </div>
</div>
<div class="container">
    <button class="secondary" onclick="window.location.href='scoreboard.php'">
        Classement
    </button>
</div>

</body>

<script>
    function reroll() {
        fetch('reroll.php', {
            method: 'POST'
        })
            .then(response => response.json())
            .then(data => {

                if (data.error) {
                    alert(data.error);
                    return;
                }

                // Images
                document.getElementById('img1').src = data.item1.image;
                document.getElementById('img2').src = data.item2.image;

                // Noms
                document.getElementById('name1').innerText = data.item1.name;
                document.getElementById('name2').innerText = data.item2.name;

                // Update boutons
                const buttons = document.querySelectorAll('.container button');

                buttons[0].setAttribute(
                    "onclick",
                    `vote('${data.item1.id}','${data.item2.id}')`
                );

                buttons[1].setAttribute(
                    "onclick",
                    `vote('${data.item2.id}','${data.item1.id}')`
                );

                // Update boutons
                const buttonDraw = document.querySelectorAll('.container .draw');

                buttonDraw[0].setAttribute(
                    "onclick",
                    `vote('${data.item2.id}','${data.item1.id}')`
                );
            });
    }

    function vote(idClicked, idOther) {
        fetch('elo.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `id_clicked=${idClicked}&id_other=${idOther}`
        })
            .then(response => response.json())
            .then(eloData => {

                console.log("Elo updated:", eloData);

                reroll();
            });
    }

    function draw(idClicked, idOther) {
        fetch('elo.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `id_clicked=${idClicked}&id_other=${idOther}&draw=1`
        })
            .then(response => response.json())
            .then(eloData => {

                console.log("Elo updated:", eloData);

                reroll();
            });
    }
</script>

</html>
