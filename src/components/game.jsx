import React, { useState, useEffect, useMemo, useRef } from 'react';
import championsData from '../data/champions.json';

// --- CONFIGURATION & UTILITAIRES ---

const STATUS = {
  CORRECT: 'correct',
  PARTIAL: 'partial',
  INCORRECT: 'incorrect',
};

const STATUS_STYLES = {
  [STATUS.CORRECT]: 'bg-green-600 border-green-500 shadow-[0_0_10px_rgba(22,163,74,0.5)]',
  [STATUS.PARTIAL]: 'bg-orange-500 border-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.5)]',
  [STATUS.INCORRECT]: 'bg-red-600 border-red-500',
  DEFAULT: 'bg-slate-800/80 border-slate-600',
};

// --- LOGIQUE SÉLECTION QUOTIDIENNE ---
// Cette fonction génère un index "aléatoire" mais fixe pour une date donnée
const getDailyTarget = () => {
  // On récupère la date locale sous format "JJ/MM/AAAA"
  const today = new Date().toLocaleDateString('fr-FR');
  
  // On transforme la date en un nombre (hash simple)
  let hash = 0;
  for (let i = 0; i < today.length; i++) {
    hash = today.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // On utilise ce hash pour choisir un index dans la liste
  // Math.abs pour éviter les négatifs
  const index = Math.abs(hash) % championsData.length;
  return championsData[index];
};

// --- LOGIQUE DES RANGS LOL ---
const getRankValue = (rankStr) => {
  if (!rankStr) return 0;
  const rank = rankStr.toLowerCase();

  if (rank.includes('joue pas') || rank.includes('unrank')) return 0;

  const tiers = [
    'iron', 'bronze', 'silver', 'gold', 'plat', 'emerald', 'diamond', 
    'master', 'grandmaster', 'challenger'
  ];

  let score = 0;
  const tierIndex = tiers.findIndex(t => rank.includes(t));
  if (tierIndex !== -1) {
    score = (tierIndex + 1) * 100;
  }

  const divisionMatch = rank.match(/(\d)/);
  if (divisionMatch) {
    const division = parseInt(divisionMatch[0], 10);
    score += (5 - division) * 10; 
  }

  return score;
};

const getComparisonStatus = (guessVal, targetVal) => {
  if (!Array.isArray(targetVal)) {
    const cleanGuess = String(guessVal).trim().toLowerCase();
    const cleanTarget = String(targetVal).trim().toLowerCase();
    return cleanGuess === cleanTarget ? STATUS.CORRECT : STATUS.INCORRECT;
  }

  const guessArr = Array.isArray(guessVal) ? guessVal : [guessVal];
  const isExactMatch = guessArr.length === targetVal.length && 
                       guessArr.every(v => targetVal.includes(v));
  
  if (isExactMatch) return STATUS.CORRECT;

  const isPartialMatch = guessArr.some(v => targetVal.includes(v));
  if (isPartialMatch) return STATUS.PARTIAL;

  return STATUS.INCORRECT;
};

// --- COMPOSANTS UI ---

const ArrowIcon = ({ direction }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3 h-3 inline-block ml-1 animate-pulse">
    {direction === 'up' 
      ? <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" />
      : <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3" />
    }
  </svg>
);

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const AdminImage = ({ id, name, className }) => {
  const [imgSrc, setImgSrc] = useState(`/images/${id}.png`);
  
  const handleError = () => {
    if (imgSrc.endsWith('.png')) {
      setImgSrc(`/images/${id}.jpg`);
    } else {
      setImgSrc('https://placehold.co/100x100?text=?');
    }
  };

  return <img src={imgSrc} alt={name} className={className} onError={handleError} />;
};

const Cell = ({ children, status, delay = 0 }) => {
  return (
    <div 
      className={`
        w-full aspect-square flex flex-col items-center justify-center p-1
        text-[10px] md:text-xs font-bold text-white text-center break-words leading-tight
        border-2 rounded transition-all duration-700 transform
        animate-flip-in
        ${STATUS_STYLES[status] || STATUS_STYLES.DEFAULT}
      `}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="drop-shadow-md flex flex-col items-center justify-center w-full h-full overflow-hidden">
        {children}
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---

export default function Game() {
  // 1. La cible est calculée une fois pour toutes (pas de useState pour target car fixe par jour)
  const target = useMemo(() => getDailyTarget(), []);
  
  const [guesses, setGuesses] = useState([]);
  const [input, setInput] = useState('');
  const [isGameOver, setIsGameOver] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false); // Pour gérer la croix
  const [selectedIndex, setSelectedIndex] = useState(0);

  // 2. Chargement du LocalStorage au démarrage
  useEffect(() => {
    const today = new Date().toLocaleDateString('fr-FR');
    const storedData = localStorage.getItem('magde-daily-state');

    if (storedData) {
      const parsedData = JSON.parse(storedData);
      
      // Si c'est la même date, on restaure la partie
      if (parsedData.date === today) {
        setGuesses(parsedData.guesses);
        setIsGameOver(parsedData.isGameOver);
        // On n'affiche la modale au chargement que si le jeu est fini
        if (parsedData.isGameOver) {
            setShowSuccessModal(true); 
        }
      } else {
        // Nouvelle journée : on nettoie
        localStorage.removeItem('magde-daily-state');
      }
    }
  }, []);

  // 3. Sauvegarde dans le LocalStorage à chaque changement d'état important
  useEffect(() => {
    if (guesses.length > 0 || isGameOver) {
      const today = new Date().toLocaleDateString('fr-FR');
      const stateToSave = {
        date: today,
        guesses,
        isGameOver
      };
      localStorage.setItem('magde-daily-state', JSON.stringify(stateToSave));
    }
  }, [guesses, isGameOver]);

  const filteredChampions = useMemo(() => {
    if (input.length < 1) return [];
    return championsData
      .filter(c => 
        c.name.toLowerCase().includes(input.toLowerCase()) && 
        !guesses.some(g => g.name === c.name)
      )
      .slice(0, 5);
  }, [input, guesses]);

  useEffect(() => setSelectedIndex(0), [filteredChampions]);

  const handleGuess = (championName) => {
    if (isGameOver || !target) return;

    const champion = championsData.find(c => c.name.toLowerCase() === championName.toLowerCase());
    
    if (champion && !guesses.some(g => g.name === champion.name)) {
      const newGuesses = [champion, ...guesses];
      setGuesses(newGuesses);
      setInput('');
      
      if (champion.name === target.name) {
        setIsGameOver(true);
        setTimeout(() => setShowSuccessModal(true), 1500); // Petit délai pour le suspense
      }
    }
  };

  const handleKeyDown = (e) => {
    if (filteredChampions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredChampions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredChampions.length) % filteredChampions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleGuess(filteredChampions[selectedIndex].name);
    }
  };

  if (!target) return <div className="text-white text-center mt-10">Chargement de la mission du jour...</div>;

  const gridColsClass = "grid grid-cols-11 gap-1 md:gap-2 w-full";

  return (
    <div className="w-full max-w-[1600px] mx-auto p-2 md:p-4 flex flex-col items-center">
      
      {/* BARRE DE RECHERCHE */}
      <div className="relative w-full max-w-md mb-6 md:mb-10 z-50">
        <div className={`relative flex items-center bg-slate-800 border-2 ${isGameOver ? 'border-green-500 opacity-50' : 'border-amber-500'} rounded-lg shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all`}>
           <div className="pl-4 text-amber-500">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
           </div>
           <input
             type="text"
             className="w-full bg-transparent p-4 text-white placeholder-slate-400 focus:outline-none font-medium tracking-wide uppercase"
             placeholder={isGameOver ? "Reviens demain !" : "Tapez un nom..."}
             value={input}
             onChange={(e) => setInput(e.target.value)}
             onKeyDown={handleKeyDown}
             disabled={isGameOver}
           />
        </div>

        {/* Suggestions */}
        {filteredChampions.length > 0 && !isGameOver && (
          <div className="absolute top-full left-0 w-full mt-2 bg-slate-800 border border-slate-600 rounded-lg shadow-xl overflow-hidden animate-fade-in">
            {filteredChampions.map((c, idx) => (
              <div
                key={c.id}
                className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${idx === selectedIndex ? 'bg-amber-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}
                onClick={() => handleGuess(c.name)}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <AdminImage id={c.id} name={c.name} className="w-10 h-10 rounded border border-slate-500 object-cover" />
                <span className="font-bold">{c.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* GRILLE DE RÉSULTATS */}
      <div className="w-full flex flex-col gap-2">
        {guesses.length > 0 && (
          <div className={`${gridColsClass} px-1 mb-1`}>
             {['Admin', 'Nom', 'Âge', 'Cheveux', 'Jeu', 'Famille', 'PC', 'Région', 'Neuille', 'Rank', 'Boisson'].map(h => (
                 <div key={h} className="text-center text-[10px] md:text-sm text-slate-400 uppercase font-bold truncate">{h}</div>
             ))}
          </div>
        )}

        {guesses.map((guess) => (
          <div key={guess.id} className={`${gridColsClass} animate-slide-up`}>
            {/* 1. L'IMAGE */}
            <div className="w-full aspect-square border-2 border-slate-600 rounded overflow-hidden relative shadow-lg z-10 bg-slate-900">
              <AdminImage id={guess.id} name={guess.name} className="w-full h-full object-cover" />
              {guess.name !== target.name && <div className="absolute inset-0 bg-red-500/20 backdrop-grayscale-[0.5]"></div>}
            </div>
            {/* 2-11. Cellules Attributs */}
            <Cell status={getComparisonStatus(guess.name, target.name)} delay={50}>{guess.name}</Cell>
            <Cell status={guess.age === target.age ? STATUS.CORRECT : STATUS.INCORRECT} delay={100}>
                <div className="flex items-center gap-1">
                {guess.age}
                {Number(guess.age) < Number(target.age) && <ArrowIcon direction="up" />}
                {Number(guess.age) > Number(target.age) && <ArrowIcon direction="down" />}
                </div>
            </Cell>
            <Cell status={getComparisonStatus(guess.cheveux, target.cheveux)} delay={200}>{Array.isArray(guess.cheveux) ? guess.cheveux.join(', ') : guess.cheveux}</Cell>
            <Cell status={getComparisonStatus(guess.JeuPref, target.JeuPref)} delay={300}>{Array.isArray(guess.JeuPref) ? guess.JeuPref.join(', ') : guess.JeuPref}</Cell>
            <Cell status={getComparisonStatus(guess.RelationFamille, target.RelationFamille)} delay={400}>{guess.RelationFamille}</Cell>
            <Cell status={getComparisonStatus(guess.PcPref, target.PcPref)} delay={500}>{Array.isArray(guess.PcPref) ? guess.PcPref.join(', ') : guess.PcPref}</Cell>
            <Cell status={getComparisonStatus(guess.régio, target.régio)} delay={600}>{Array.isArray(guess.régio) ? guess.régio.join(',\n') : guess.régio}</Cell>
            <Cell status={getComparisonStatus(guess.neuillitude, target.neuillitude)} delay={700}>{guess.neuillitude}</Cell>
            <Cell status={getRankValue(guess.RankLol) === getRankValue(target.RankLol) ? STATUS.CORRECT : STATUS.INCORRECT} delay={800}>
                <div className="flex flex-col items-center">
                <span>{guess.RankLol}</span>
                <div className="flex items-center mt-1 h-3">
                    {getRankValue(guess.RankLol) < getRankValue(target.RankLol) && <ArrowIcon direction="up" />}
                    {getRankValue(guess.RankLol) > getRankValue(target.RankLol) && <ArrowIcon direction="down" />}
                </div>
                </div>
            </Cell>
            <Cell status={getComparisonStatus(guess.BoissonPref, target.BoissonPref)} delay={900}>{Array.isArray(guess.BoissonPref) ? guess.BoissonPref.join(', ') : guess.BoissonPref}</Cell>
          </div>
        ))}
      </div>

      {/* MODALE VICTOIRE (AVEC CROIX) */}
      {showSuccessModal && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-4">
            <div className="relative bg-slate-900 border-2 border-amber-500 p-8 rounded-xl text-center shadow-[0_0_50px_rgba(245,158,11,0.5)] max-w-sm w-full mx-auto">
              
              {/* Bouton Fermer (Croix) */}
              <button 
                onClick={() => setShowSuccessModal(false)}
                className="absolute top-2 right-2 text-slate-400 hover:text-white transition-colors p-2"
                title="Fermer et voir les résultats"
              >
                <CloseIcon />
              </button>

              <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-t from-amber-600 to-yellow-300 mb-4 uppercase">
                Victoire !
              </h2>
              <div className="w-32 h-32 mx-auto mb-4 rounded-full p-1 bg-gradient-to-b from-amber-400 to-amber-700">
                 <AdminImage id={target.id} name={target.name} className="w-full h-full rounded-full object-cover border-4 border-slate-900" />
              </div>
              <p className="text-slate-300 mb-6">
                Bravo ! L'admin du jour était <span className="text-white font-bold text-xl block mt-1">{target.name}</span>
              </p>
              
              <div className="text-sm text-slate-500 mt-4 border-t border-slate-700 pt-4">
                Prochain admin dans : <br/>
                <CountdownToMidnight />
              </div>
            </div>
         </div>
      )}

      {/* Styles */}
      <style>{`
        @keyframes flip-in {
          0% { transform: rotateX(-90deg); opacity: 0; }
          100% { transform: rotateX(0); opacity: 1; }
        }
        .animate-flip-in { animation: flip-in 0.6s cubic-bezier(0.4, 0, 0.2, 1) backwards; }
        .animate-slide-up { animation: slide-up 0.4s ease-out; }
        @keyframes slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

// Petit composant pour le compte à rebours
const CountdownToMidnight = () => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setHours(24, 0, 0, 0); // Minuit prochaine
      const diff = tomorrow - now;

      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / (1000 * 60)) % 60);
      const s = Math.floor((diff / 1000) % 60);
      
      setTimeLeft(`${h}h ${m}m ${s}s`);
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, []);

  return <span className="font-mono text-amber-500 font-bold text-lg">{timeLeft}</span>;
};