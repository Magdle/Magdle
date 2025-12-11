import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

// --- CONFIGURATION ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// 1. On charge le fichier planning crypté
const planningPath = path.join(__dirname, '../data/planning.json');
let planningData;

try {
  planningData = require(planningPath);
} catch (e) {
  console.error("❌ Impossible de lire le fichier planning.json");
  process.exit(1);
}

// 2. La date précise que tu veux vérifier (Format YYYY-MM-DD)
// Le code génère des dates au format ISO (2025-12-10)
const dateCible = "2025-12-11";

console.log(`🔍 Vérification pour le : ${dateCible}`);

// 3. Récupération et Décryptage
const encryptedName = planningData[dateCible];

if (!encryptedName) {
  console.log("⚠️ Aucune entrée trouvée pour cette date dans le planning !");
} else {
  // Décodage Base64 -> Texte
  const realName = Buffer.from(encryptedName, 'base64').toString('utf-8');
  
  console.log("------------------------------------------------");
  console.log(`🔐 Nom crypté : ${encryptedName}`);
  console.log(`🔓 NOM DÉCRYPTÉ : ${realName}`);
  console.log("------------------------------------------------");
  console.log("Si ce nom correspond à celui que tu as en jeu, tout fonctionne ! ✅");
}