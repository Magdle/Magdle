const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export default function ScoreBoardModal({
  scores,
  onClose,
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="
        relative
        bg-slate-900
        border-2 border-amber-500
        p-6
        rounded-xl
        shadow-[0_0_40px_rgba(245,158,11,0.45)]
        max-w-sm w-full
        text-center
        animate-fade-in
      ">

        {/* Close */}
        <button
          onClick={onClose}
          className="
            absolute top-2 right-2
            text-slate-400 hover:text-white
            transition-colors
            p-2
          "
          title="Fermer"
        >
          ✕
        </button>

        {/* Title */}
        <h2 className="
          text-3xl
          font-extrabold
          uppercase
          mb-6
          text-transparent
          bg-clip-text
          bg-gradient-to-t
          from-amber-600
          to-yellow-300
        ">
          Classement du jour
        </h2>

        {/* Scores */}
        {scores.length === 0 ? (
          <p className="text-slate-400 text-sm">
            Aucun score enregistré aujourd’hui
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
            {scores.map((s, i) => (
              <div
                key={`${s.value}-${i}`}
                className={`
                  flex items-center justify-between
                  px-4 py-3 rounded-lg
                  transition-all
                  ${
                    i === 0
                      ? "bg-amber-500 text-slate-900 font-extrabold shadow-[0_0_15px_rgba(245,158,11,0.5)]"
                      : "bg-slate-800 text-slate-200"
                  }
                `}
              >
                <span className="flex items-center gap-2">
                  <span className="font-bold">#{i + 1}</span>
                  {s.value}
                </span>

                
                
                <span className="text-sm opacity-80">
                  {s.score} essais
                </span>
              </div>
            ))}
            
          </div>
        )}


        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-700 text-xs text-slate-500">
          Scores réinitialisés à minuit (heure de Paris)
        </div>
      </div>
    </div>
  );
}
