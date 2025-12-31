import { useState, useMemo, useEffect } from "react";
import championsData from "../data/champions.json";

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export default function PlayerSearch({ onConfirm }) {
  const [input, setInput] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [rememberMe, setRememberMe] = useState(false);

  const normalize = (str) =>
    str
      .toLowerCase()
      .normalize("NFD")                 // sépare accents
      .replace(/[\u0300-\u036f]/g, "")  // supprime accents
      .replace(/[^a-z0-9]/g, "");       // supprime espaces, -, ', etc.
    

  const filteredChampions = useMemo(() => {
    if (!input) return [];
    return championsData
      .filter(c => normalize(c.name).includes(input.toLowerCase()))
      .slice(0, 5);
  }, [input]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredChampions]);

  const handleSelect = (champion) => {
    setSelectedPlayerId(champion.id);
    setInput(champion.name);
  };

  const handleConfirm = () => {
    if (!selectedPlayerId) return;
    const maxAge = 60 * 60 * 24 * 180;
    if (rememberMe && typeof document !== "undefined") {
      document.cookie = `magde-player=${encodeURIComponent(
        String(selectedPlayerId)
      )}; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
    } else if (typeof document !== "undefined") {
      document.cookie = "magde-player=; Max-Age=0; Path=/; SameSite=Lax";
    }
    onConfirm(selectedPlayerId);
  };

  const handleKeyDown = (e) => {
    if (!filteredChampions.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(i => (i + 1) % filteredChampions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(i => (i - 1 + filteredChampions.length) % filteredChampions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleSelect(filteredChampions[selectedIndex]);
    }
  };

    const AdminImage = ({ id, imageId, name, className }) => {
    const imageKey = imageId ?? id;
    const [imgSrc, setImgSrc] = useState(`/images/${imageKey}.png`);
    const handleError = () => {
      if (imgSrc.endsWith('.png')) setImgSrc(`/images/${imageKey}.jpg`);
      else setImgSrc('https://placehold.co/100x100?text=?');
    };
    return <img src={imgSrc} alt={name} className={className} onError={handleError} />;
  };
  
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">

      <div className="bg-slate-900 border-2 border-amber-500 rounded-xl p-8 w-full max-w-sm text-center shadow-[0_0_40px_rgba(245,158,11,0.4)] animate-fade-in">

        <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-t from-amber-600 to-yellow-300 mb-6 uppercase">
          Qui es-tu ?
        </h2>

        {/* INPUT */}
        <div className="relative">
          <div className="flex items-center bg-slate-800 border-2 border-amber-500 rounded-lg">
            <div className="pl-4 text-amber-500">🔍</div>
            <input
              type="text"
              autoComplete="off"
              placeholder="Tape ton nom..."
              className="w-full bg-transparent p-4 text-white uppercase focus:outline-none"
              value={input}
              onChange={e => {
                setInput(e.target.value);
                setSelectedPlayerId(null);
              }}
              onKeyDown={handleKeyDown}
            />
          </div>

          {/* AUTOCOMPLETE */}
          {filteredChampions.length > 0 && !selectedPlayerId && (
            <div className="absolute top-full left-0 w-full mt-2 bg-slate-800 border border-slate-600 rounded-lg overflow-hidden z-50">
              {filteredChampions.map((c, i) => (
                <div
                  key={c.id}
                  className={`flex items-center gap-3 p-3 cursor-pointer transition-colors
                    ${i === selectedIndex ? "bg-amber-600 text-white" : "text-slate-300 hover:bg-slate-700"}
                  `}
                  onClick={() => handleSelect(c)}
                  onMouseEnter={() => setSelectedIndex(i)}
                >
                  <AdminImage
                    id={c.id}
                    imageId={c.imageId}
                    name={c.name}
                    className="w-10 h-10 rounded border border-slate-500 object-cover"
                  />
                  <span className="font-bold">{c.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CONFIRM */}
        <button
          onClick={handleConfirm}
          disabled={!selectedPlayerId}
          className="
            w-full mt-4
            bg-amber-500 hover:bg-amber-600
            text-slate-900
            font-extrabold uppercase tracking-wide
            py-3 px-6 rounded-lg
            transition-all duration-200
            shadow-[0_0_15px_rgba(245,158,11,0.4)]
            hover:shadow-[0_0_25px_rgba(245,158,11,0.7)]
            active:scale-95
          "
        >
          Commencer la partie
        </button>

        <label className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="accent-amber-500"
          />
          Se souvenir de moi
        </label>

        <a
          href="https://forms.gle/3FL8GizLU7uquk4W6"
          target="_blank"
          rel="noreferrer"
          className="
            block mt-4 text-sm text-amber-300
            hover:text-amber-200 underline underline-offset-4
            transition-colors
          "
        >
          Pas dans la liste ? Inscris-toi !
        </a>

      </div>
    </div>
  );
}
