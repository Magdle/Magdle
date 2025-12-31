import csv
import json
# J'assume ici que vous avez corrigé l'import en fonction de votre installation (pip install slugify)
from slugify import slugify 

# --- Configuration ---
# Correction du double nom de variable et utilisation d'une raw string (r'...') pour les chemins Windows
# J'ai corrigé 'magdle' en 'magde' (avec un 'g')
INPUT_CSV_FILE = r'C:\\Users\\florian1911\\Documents\\magellande\\Conversion\\magdle_reponses.csv'

# Nom du fichier JSON en sortie
OUTPUT_JSON_FILE = 'magde_data.json'
# Délimiteur : le point-virgule (;) est fréquent dans les CSV générés par GSheet en France/Belgique.
# Si vous obtenez des résultats bizarres, changez-le pour une virgule (',')
CSV_DELIMITER = ','

# --- Mappage des titres de colonnes (selon le CSV fourni) ---
# NOTE: Ces noms de colonnes sont très sensibles à la casse et aux sauts de ligne (\n).

COL_NAME = "Quel est ton prénom + nom ?"
COL_AGE = "Quel âge as tu ?"
COL_REGION = "D'où viens tu ?"
COL_CHEVEUX = "Quelle est ta couleur de cheveux si t'en a?\n(évitez la case \"autre\" si possible)"
COL_NEUILLITUDE = "Sur l'échelle de la neuillitude, ou te trouves tu?\n(sois honnête sinon on met pour toi)"
COL_JEU_PREF = "Quel est ton style de jeu vidéo préféré ?"
COL_RELATION_FAMILLE = "Considère tu que tu as une bonne relation avec ta famille ?"
COL_PC_PREF = "Quel est ton pc favori au mag ?\n(mag1, mag2, ...)"
COL_BOISSON_PREF = "ta boisson préféré au mag?"
COL_RANK_LOL = "Est ce que tu joue a LOL? Si oui, Quel est ton rank ?"


def generate_json_data(input_csv_file, output_json_file, delimiter):
    """Lit un fichier CSV, le convertit en liste d'objets JSON, et sauvegarde le résultat."""
    
    data = []
    
    # Ouvrir le fichier CSV
    try:
        # Lire avec 'utf-8' pour supporter les accents et caractères spéciaux
        with open(input_csv_file, mode='r', encoding='utf-8') as csvfile:
            # Utiliser csv.DictReader pour lire les données en utilisant les en-têtes comme clés
            reader = csv.DictReader(csvfile, delimiter=delimiter)
            
            # Pour chaque ligne de données
            for i, row in enumerate(reader):
                
                # Vérification de base des champs essentiels
                if not row.get(COL_NAME) or not row.get(COL_AGE):
                    # On ignore les lignes vides ou incomplètes (comme la dernière ligne vide du CSV)
                    continue 

                # Nettoyage et extraction des données 
                
                # 1. Champs directs avec nettoyage de base (.strip())
                name = row.get(COL_NAME, "").strip()
                age = row.get(COL_AGE, "").strip()
                region = row.get(COL_REGION, "").strip()
                neuillitude = row.get(COL_NEUILLITUDE, "").strip()
                jeu_pref_raw = row.get(COL_JEU_PREF, "").strip()
                relation_famille = row.get(COL_RELATION_FAMILLE, "").strip()
                pc_pref = row.get(COL_PC_PREF, "").strip()
                boisson_pref = row.get(COL_BOISSON_PREF, "").strip()
                rank_lol = row.get(COL_RANK_LOL, "").strip()
                cheveux_raw = row.get(COL_CHEVEUX, "").strip()


                # 2. Logique de transformation pour les listes et IDs
                
                # Générer l'ID (basé sur le nom, nettoyé)
                # Utilise slugify(name).replace('-', '') pour le format sans tiret
                id_val = slugify(name).replace('-', '').lower() 
                
                # Cheveux (peut contenir des virgules, ex: "Noir, avec mèche rose")
                cheveux = [c.strip().capitalize() for c in cheveux_raw.split(',') if c.strip()]
                
                # Type de jeu préféré (champ texte direct)
                jeu_pref_type = jeu_pref_raw

                # --- Création de l'Objet Final ---
                
                person_data = {
                    "id": id_val,
                    "name": name,
                    "age": age,
                    "cheveux": cheveux,
                    "JeuPrefType": jeu_pref_type,
                    # Normalisation des valeurs de RelationFamille
                    "RelationFamille": "Compliquée" if "compliqué" in relation_famille.lower() or "non" in relation_famille.lower() else "Trkl",
                    "PcPref": pc_pref,
                    "régio": region.capitalize(),
                    "neuillitude": neuillitude,
                    "RankLol": rank_lol if rank_lol else "Non renseigné", # Gère les champs vides
                    "BoissonPref": boisson_pref
                }
                data.append(person_data)

        # Écrire les données dans le fichier JSON
        with open(output_json_file, 'w', encoding='utf-8') as jsonfile:
            # Utiliser indent=2 pour formater le JSON et le rendre lisible
            json.dump(data, jsonfile, ensure_ascii=False, indent=2)
            
        print(f"✅ Conversion réussie ! {len(data)} lignes converties.")
        print(f"Le fichier JSON est disponible ici : {output_json_file}")
        
    except FileNotFoundError:
        # Affiche un message plus clair pour l'utilisateur
        print(f"❌ Erreur: Le fichier '{input_csv_file}' n'a pas été trouvé.")
        print(f"Vérifiez l'orthographe du chemin et du nom du fichier ('magde_reponses.csv').")
    except Exception as e:
        print(f"❌ Une erreur critique s'est produite: {e}")
        # Affiche la ligne qui a causé l'erreur pour le débogage
        if 'row' in locals():
            print(f"Détails de la ligne en échec : {row}")

# --- Exécution du Script ---
if __name__ == "__main__":
    
    generate_json_data(INPUT_CSV_FILE, OUTPUT_JSON_FILE, CSV_DELIMITER)
