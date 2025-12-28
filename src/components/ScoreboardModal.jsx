import { useEffect, useState } from "react";

/* ---------------- Utils ---------------- */

const getParisToday = () => {
  const now = new Date();
  const paris = new Date(
    now.toLocaleString("en-US", { timeZone: "Europe/Paris" })
  );
  return paris.toISOString().slice(0, 10); // YYYY-MM-DD
};

/* ---------------- Component ---------------- */

export default function ScoreBoardModal({ onClose }) {
  const [date, setDate] = useState(getParisToday());
  const [scores, setScores] = useState([]);
  const [target, setTarget] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadScores = async (selectedDate) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leaderboard?date=${selectedDate}`);
      const data = await res.json();

      setScores(data.scores || []);
      setTarget(data.target || null);
    } catch (err) {
      console.error("Erreur chargement leaderboard :", err);
      setScores([]);
      setTarget(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScores(date);
  }, [date]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="
        relative bg-slate-900 border-2 border-amber-500
        p-6 rounded-xl shadow-[0_0_40px_rgba(245,158,11,0.45)]
        max-w-sm w-full text-center animate-fade-in
      ">

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-slate-400 hover:text-white p-2"
        >
          ✕
        </button>

        {/* Title */}
        <h2 className="text-3xl font-extrabold uppercase mb-2 text-transparent bg-clip-text bg-gradient-to-t from-amber-600 to-yellow-300">
          Classement
        </h2>

        {/* Date picker */}
        <div className="mb-4">
            <input
              type="date"
              value={date}
              min="2025-12-17"
              max={getParisToday()}
              onChange={(e) => setDate(e.target.value)}
              className="
                bg-slate-800 border border-slate-600
                rounded-lg px-3 py-2 text-slate-200
                focus:outline-none focus:ring-2 focus:ring-amber-500
              "
            />

        </div>

        {/* Target of the day */}
        {target && (
          <div className="
            mb-4 p-1 rounded-lg
            bg-slate-800 border border-slate-600
            text-slate-300 text-sm
          ">
            👤 Admin du jour :
            <span className="block text-amber-400 font-bold text-lg mt-0">
              {target.name}
            </span>
          </div>
        )}

        {/* Scores */}
        {loading ? (
          <p className="text-slate-400 text-sm">Chargement…</p>
        ) : scores.length === 0 ? (
          <p className="text-slate-400 text-sm">
            Aucun score pour cette date
          </p>
        ) : (
          <div
            className="
              flex flex-col gap-2
              max-h-[320px]
              overflow-y-auto
              pr-1
              scrollbar-thin
              scrollbar-thumb-amber-500/60
              scrollbar-track-slate-800
            "
          >
          {(() => {
            let lastScore = null;
            let rank = 0;
          
            return scores.map((s, i) => {
              // 👇 Si le score change, on passe au rang suivant
              if (lastScore === null || s.score !== lastScore) {
                rank += 1;
                lastScore = s.score;
              }
            
              return (
                <div
                  key={`${s.value}-${i}`}
                  className={`
                    flex items-center justify-between
                    px-4 py-3 rounded-lg
                    transition-all
                    ${
                      rank === 1
                        ? "bg-amber-500 text-slate-900 font-extrabold shadow-[0_0_15px_rgba(245,158,11,0.5)]"
                        : "bg-slate-800 text-slate-200"
                    }
                  `}
                >
                  <span className="flex items-center gap-2">
                    <span className="font-bold">#{rank}</span>
                    {s.value}
                  </span>
                  
                  <span className="text-sm opacity-80">
                    {s.score} essais
                  </span>
                </div>
              );
            });
          })()}

          </div>
        )}
      </div>
    </div>
  );
}
