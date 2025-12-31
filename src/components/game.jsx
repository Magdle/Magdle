import React, { useState, useEffect, useMemo } from 'react';
import championsData from '../data/champions.json';
import PlayerSearchModal from "./PlayerSearchModal";
import ScoreBoardModal from './ScoreboardModal';
import WinModal from "./WinModal";
import { normalize, getParisDateString } from "../utils";
// --- CONFIGURATION & CONSTANTES ---
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

// --- FONCTIONS UTILITAIRES ---



const getDynamicFontSize = (text) => {
  const str = String(text);
  if (str.length > 15) return "text-[8px] leading-[0.9] break-words";
  if (str.length > 10) return "text-[9px] leading-3 break-words";
  return "";
};

const getRankValue = (rankStr) => {
  if (!rankStr) return 0;
  const rank = rankStr.toLowerCase();
  if (rank.includes('joue pas') || rank.includes('unrank')) return 0;
  const tiers = ['iron', 'bronze', 'silver', 'gold', 'plat', 'emerald', 'diamond', 'master', 'grandmaster', 'challenger'];
  let score = 0;
  const tierIndex = tiers.findIndex(t => rank.includes(t));
  if (tierIndex !== -1) score = (tierIndex + 1) * 100;
  const divisionMatch = rank.match(/(\d)/);
  if (divisionMatch) score += (5 - parseInt(divisionMatch[0], 10)) * 10;
  return score;
};

const getPcValue = (pcInput) => {
  const str = Array.isArray(pcInput) ? pcInput[0] : pcInput;
  if (!str) return 0;
  const match = String(str).match(/(\d+)/);
  return match ? parseInt(match[0], 10) : 0;
};

const getNeuillitudeValue = (val) => {
  const v = String(val).toLowerCase().trim();
  const num = parseInt(v);
  if (!isNaN(num)) return num;
  if (v.includes('pas') || v === '0') return 1;
  if (v.includes('semi')) return 4;
  if (v === 'neuille') return 7;
  if (v.includes('elev') || v.includes('élev')) return 9;
  return 1;
};

const getComparisonStatus = (guessVal, targetVal) => {
  if (!Array.isArray(targetVal)) {
    const cleanGuess = String(guessVal).trim().toLowerCase();
    const cleanTarget = String(targetVal).trim().toLowerCase();
    return cleanGuess === cleanTarget ? STATUS.CORRECT : STATUS.INCORRECT;
  }
  const guessArr = Array.isArray(guessVal) ? guessVal : [guessVal];
  const isExactMatch = guessArr.length === targetVal.length && guessArr.every(v => targetVal.includes(v));
  if (isExactMatch) return STATUS.CORRECT;
  const isPartialMatch = guessArr.some(v => targetVal.includes(v));
  if (isPartialMatch) return STATUS.PARTIAL;
  return STATUS.INCORRECT;
};

const getCookieValue = (name) => {
  if (typeof document === "undefined") return null;
  const cookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  if (!cookie) return null;
  return decodeURIComponent(cookie.split("=").slice(1).join("="));
};

const resolveCookiePlayerId = () => {
  const stored = getCookieValue("magde-player");
  if (!stored) return null;
  const numericId = Number(stored);
  if (!Number.isInteger(numericId)) return null;
  const matchById = championsData.find((c) => c.id === numericId);
  return matchById ? matchById.id : null;
};

const clearPlayerCookie = () => {
  if (typeof document === "undefined") return;
  document.cookie = "magde-player=; Max-Age=0; Path=/; SameSite=Lax";
};

const getPlayerNameById = (playerId) => {
  const match = championsData.find((c) => c.id === playerId);
  return match ? match.name : "quelqu'un";
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

const AdminImage = ({ id, imageId, name, className }) => {
  const imageKey = imageId ?? id;
  const [imgSrc, setImgSrc] = useState(`/images/${imageKey}.png`);
  const handleError = () => {
    if (imgSrc.endsWith('.png')) setImgSrc(`/images/${imageKey}.jpg`);
    else setImgSrc('https://placehold.co/100x100?text=?');
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
  const [isMounted, setIsMounted] = useState(false);
  
  // Utilisation de useMemo pour ne calculer le target qu'une seule fois au montage
  // Note : S'assure de n'être appelé que côté client si nécessaire via isMounted dans le render,
  // mais ici le calcul est safe même côté serveur (sauf window.atob qui nécessiterait un polyfill si SSR strict)
  // Comme getDailyTarget utilise window.atob, il vaut mieux l'exécuter dans un useEffect ou vérifier le target après montage.
  // Cependant, pour simplifier et éviter le 'target is undefined', on peut l'initialiser ici si on est sûr d'être dans un env navigateur, 
  // OU on laisse le code tel quel car React gère les erreurs de rendu initial.
  
  const [guesses, setGuesses] = useState([]);
  const [target, setTarget] = useState(null);
  const [input, setInput] = useState('');
  const [isGameOver, setIsGameOver] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showDashboardModal, setShowDashboardModal] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showPlayerModal, setShowPlayerModal] = useState(true);

  
  useEffect(() => {
    const loadTarget = async () => {
      try {
        const res = await fetch("/api/dailyTarget");
        const data = await res.json();

        const champion = data?.id != null
          ? championsData.find(c => c.id === Number(data.id))
          : championsData.find(c => c.name === data?.name);

        setTarget(champion || championsData[0]);
      } catch (e) {
        console.error("Erreur chargement admin du jour", e);
        setTarget(championsData[0]);
      }
    };

    loadTarget();
  }, []);

  
  useEffect(() => {
    setIsMounted(true);
  }, []);


// À REMPLACER : Le useEffect qui sauvegarde quand on joue
useEffect(() => {
  if (!target) return;

  if (guesses.length > 0 || isGameOver) {
    const todayISO = getParisDateString();
    localStorage.setItem(
      'magde-daily-state',
      JSON.stringify({
        date: todayISO,
        guesses,
        isGameOver,
        targetName: target.name
      })
    );
  }
}, [guesses, isGameOver, target]);

const filteredChampions = useMemo(() => {
  if (input.length < 1) return [];

  const normalizedInput = normalize(input);

  return championsData
    .filter(c => {
      const normalizedName = normalize(c.name);

      console.log(
        "Comparing:",
        normalizedName,
        "with input:",
        normalizedInput
      );

      return (
        normalizedName.includes(normalizedInput) &&
        !guesses.some(g => g.id === c.id)
      );
    })
    .slice(0, 5);
}, [input, guesses]);



  useEffect(() => setSelectedIndex(0), [filteredChampions]);
  const [scores, setScores] = useState([]);
  
  const [currentPlayer, setCurrentPlayer] = useState(null);

  useEffect(() => {
    const playerId = resolveCookiePlayerId();
    if (playerId != null) {
      setCurrentPlayer(playerId);
      setShowPlayerModal(false);
    } else {
      setCurrentPlayer(null);
      setShowPlayerModal(true);
    }
  }, []);

  const loadScores = async () => {
  const res = await fetch("/api/leaderboard");
  const data = await res.json();
  setScores(data);
};


const handleGuess = (championName) => {
  if (!currentPlayer) {
    setShowPlayerModal(true);
    return;
  }
  if (isGameOver || !target) return;

  const champion = championsData.find(
    c => c.name.toLowerCase() === championName.toLowerCase()
  );

  if (!champion || guesses.some(g => g.id === champion.id)) return;

  const newGuesses = [champion, ...guesses];
  setGuesses(newGuesses);
  setInput('');

  if (champion.id === target.id) {
    const attempts = newGuesses.length; // ✅ BON NOMBRE
    const guessIds = newGuesses.map(g => g.id).reverse();

    setIsGameOver(true);
    sendScore(attempts, guessIds);               // ✅ BON JOUEUR + BON SCORE
    setTimeout(() => setShowSuccessModal(true), 1500);
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
      setSelectedIndex(0);
      handleGuess(filteredChampions[selectedIndex].name);
    }
  };



const sendScore = async (attempts, guessIds) => {
  if (!currentPlayer) {
    setShowPlayerModal(true);
    console.error("❌ Aucun joueur défini");
    return;
  }

  console.log("📤 SEND SCORE", {
    playerId: currentPlayer,
    attempts,
  });

  const res = await fetch("/api/score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      playerId: currentPlayer,
      attempts, // ✅ BON NOM
      guessIds,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("❌ Score non enregistré :", text);
  }
};






  if (!isMounted) return <div className="min-h-screen bg-slate-900"></div>;

  if (!target) return <div className="text-white text-center mt-10">Chargement...</div>;

  const gridColsClass = "grid grid-cols-11 gap-1 md:gap-2 w-full";

  return (
    <>
    <div className="w-full max-w-[1600px] mx-auto px-2 md:px-4  pb-2 flex flex-col items-center">

      {currentPlayer && (
        <button
          type="button"
          onClick={() => {
            clearPlayerCookie();
            setCurrentPlayer(null);
            setShowPlayerModal(true);
          }}
          className="
            mb-4 text-sm text-amber-300
            hover:text-amber-200 underline underline-offset-4
            transition-colors
          "
        >
          Tu n'es pas {getPlayerNameById(currentPlayer)} ?
        </button>
      )}

          {isGameOver && (
            <button
              onClick={() => {
                loadScores();
                setShowDashboardModal(true);
              }}
              className="
                mb-4 px-4 py-2
                rounded-lg
                bg-slate-700 hover:bg-slate-600
                text-white font-bold
                shadow-lg
                transition
              "
            >
              🏆 Voir le classement
            </button>
          )}

      {/* BARRE DE RECHERCHE */}
      <div className="relative w-full max-w-md mb-6 md:mb-10 z-50">
        <div className={`relative flex items-center bg-slate-800 border-2 ${isGameOver ? 'border-green-500 opacity-50' : 'border-amber-500'} rounded-lg shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all`}>
           <div className="pl-4 text-amber-500">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
           </div>
           <input
             type="text"
             autoComplete="off" 
             className="w-full bg-transparent p-4 text-white placeholder-slate-400 focus:outline-none font-medium tracking-wide uppercase"
             placeholder={"Tapez un nom..."}
             value={input}
             onChange={(e) => setInput(e.target.value)}
             onKeyDown={handleKeyDown}
             disabled={isGameOver || !currentPlayer}
           />
        </div>
        
        {filteredChampions.length > 0 && !isGameOver && (
          <div className="absolute top-full left-0 w-full mt-2 bg-slate-800 border border-slate-600 rounded-lg shadow-xl overflow-hidden animate-fade-in">
            {filteredChampions.map((c, idx) => (
              <div
                key={c.id}
                className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${idx === selectedIndex ? 'bg-amber-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}
                onClick={() => handleGuess(c.name)}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <AdminImage id={c.id} imageId={c.imageId} name={c.name} className="w-10 h-10 rounded border border-slate-500 object-cover" />
                <span className="font-bold">{c.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* GRILLE DE RÉSULTATS */}
      <div className="w-full overflow-x-auto pb-4"> 
        <div className="min-w-[900px] flex flex-col gap-2">
          {guesses.length > 0 && (
            <div className={`${gridColsClass} px-1 mb-1`}>
                {['Admin', 'Nom', 'Âge', 'Cheveux', 'Jeu', 'Famille', 'PC', 'Région', 'Neuille', 'Rank', 'Boisson'].map(h => (
                  <div key={h} className="text-center text-[10px] md:text-sm text-slate-400 uppercase font-bold truncate">{h}</div>
                ))}
            </div>
          )}

          {guesses.map((guess) => (
            <div key={guess.id} className={`${gridColsClass} animate-slide-up`}>
              {/* Image Sticky */}
              <div className="sticky left-0 z-20 w-full aspect-square border-2 border-slate-600 rounded overflow-hidden relative shadow-lg bg-slate-900">
                <AdminImage id={guess.id} imageId={guess.imageId} name={guess.name} className="w-full h-full object-cover" />
                {guess.id !== target.id && <div className="absolute inset-0 bg-red-500/20 backdrop-grayscale-[0.5]"></div>}
              </div>

              {/* Cellules */}
              <Cell status={getComparisonStatus(guess.name, target.name)} delay={50}>
                <span className={`w-full ${getDynamicFontSize(guess.name)}`}>
                  {guess.name}
                </span>
              </Cell>
              
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
              
              <Cell status={getPcValue(guess.PcPref) === getPcValue(target.PcPref) ? STATUS.CORRECT : STATUS.INCORRECT} delay={500}>
                  <div className="flex flex-col items-center">
                      <span>{Array.isArray(guess.PcPref) ? guess.PcPref.join(', ') : guess.PcPref}</span>
                      <div className="flex items-center mt-1 h-3">
                          {getPcValue(guess.PcPref) < getPcValue(target.PcPref) && <ArrowIcon direction="up" />}
                          {getPcValue(guess.PcPref) > getPcValue(target.PcPref) && <ArrowIcon direction="down" />}
                      </div>
                  </div>
              </Cell>

              <Cell status={getComparisonStatus(guess.régio, target.régio)} delay={600}>{Array.isArray(guess.régio) ? guess.régio.join(',\n') : guess.régio}</Cell>
              
              <Cell status={getNeuillitudeValue(guess.neuillitude) === getNeuillitudeValue(target.neuillitude) ? STATUS.CORRECT : STATUS.INCORRECT} delay={700}>
                  <div className="flex flex-col items-center">
                      <span>{guess.neuillitude}</span>
                      <div className="flex items-center mt-1 h-3">
                          {getNeuillitudeValue(guess.neuillitude) < getNeuillitudeValue(target.neuillitude) && <ArrowIcon direction="up" />}
                          {getNeuillitudeValue(guess.neuillitude) > getNeuillitudeValue(target.neuillitude) && <ArrowIcon direction="down" />}
                      </div>
                  </div>
              </Cell>

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
      </div>

      
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

    {showDashboardModal && (
      <ScoreBoardModal
        onClose={() => setShowDashboardModal(false)}
      />
    )}

        
    {showSuccessModal && (
      <WinModal
        target={target}
        onClose={() => setShowSuccessModal(false)}
        onShowLeaderboard={() => {
          loadScores();            // 👈 RECHARGE
          setShowSuccessModal(false);
          setShowDashboardModal(true);
        }}
      />

    )}

    {showPlayerModal && (
      <PlayerSearchModal
      onConfirm={(playerId) => {
        setCurrentPlayer(playerId);
        setShowPlayerModal(false);
      }}
      />
    )}
    </>
  );
}
