import { useState, useMemo, useEffect } from "react";
import championsData from "../data/champions.json";

export default function PlayerSearch({ value, onSelect, disabled }) {
  const [input, setInput] = useState(value || "");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredChampions = useMemo(() => {
    if (input.length < 1) return [];
    return championsData
      .filter(c =>
        c.name.toLowerCase().includes(input.toLowerCase())
      )
      .slice(0, 5);
  }, [input]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredChampions]);

  const [isSelected, setIsSelected] = useState(false);

  const handleChange = (e) => {
    setInput(e.target.value);
    setIsSelected(false); // 🔑
  };


  const handleSelect = (champion) => {
    setInput(champion.name);
    onSelect(champion.name);
    setIsSelected(true); // 🔑
  };


  const handleKeyDown = (e) => {
    if (filteredChampions.length === 0) return;

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

  const AdminImage = ({ id, name, className }) => {
    const [imgSrc, setImgSrc] = useState(`/images/${id}.png`);
    const handleError = () => {
      if (imgSrc.endsWith('.png')) setImgSrc(`/images/${id}.jpg`);
      else setImgSrc('https://placehold.co/100x100?text=?');
    };
    return <img src={imgSrc} alt={name} className={className} onError={handleError} />;
  };
  return (
    <div className="relative w-full z-50">
      {/* Input */}
      <div
        className={`
          relative flex items-center bg-slate-800 border-2
          ${disabled ? "border-slate-600 opacity-50" : "border-amber-500"}
          rounded-lg shadow-[0_0_15px_rgba(245,158,11,0.3)]
        `}
      >
        <div className="pl-4 text-amber-500">
          🔍
        </div>
        <input
          type="text"
          autoComplete="off"
          disabled={disabled}
          className="w-full bg-transparent p-4 text-white placeholder-slate-400 focus:outline-none font-medium uppercase"
          placeholder="Tape ton nom..."
          value={input}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
      </div>

      {/* Suggestions */}
      {filteredChampions.length > 0 && !disabled && !isSelected && (
        <div className="absolute top-full left-0 w-full mt-2 bg-slate-800 border border-slate-600 rounded-lg shadow-xl overflow-hidden animate-fade-in">
          {filteredChampions.map((c, idx) => (
            <div
              key={c.id}
              className={`
                flex items-center gap-3 p-3 cursor-pointer transition-colors
                ${idx === selectedIndex
                  ? "bg-amber-600 text-white"
                  : "text-slate-300 hover:bg-slate-700"}
              `}
              onClick={() => handleSelect(c)}
              onMouseEnter={() => setSelectedIndex(idx)}
            >
              <AdminImage
                id={c.id}
                name={c.name}
                className="w-10 h-10 rounded border border-slate-500 object-cover"
              />
              <span className="font-bold">{c.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
