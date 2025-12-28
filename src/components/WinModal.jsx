import { useState, useEffect } from "react";


import PlayerSearch from "./PlayerSearch";

  const AdminImage = ({ id, name, className }) => {
    const [imgSrc, setImgSrc] = useState(`/images/${id}.png`);
    const handleError = () => {
      if (imgSrc.endsWith('.png')) setImgSrc(`/images/${id}.jpg`);
      else setImgSrc('https://placehold.co/100x100?text=?');
    };
    return <img src={imgSrc} alt={name} className={className} onError={handleError} />;
  };

const CountdownToMidnight = () => {
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const parisTimeStr = now.toLocaleString("en-US", {timeZone: "Europe/Paris"});
      const parisDate = new Date(parisTimeStr);
      const tomorrow = new Date(parisDate);
      tomorrow.setHours(24, 0, 0, 0);
      const diff = tomorrow - parisDate;
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

export default function WinModal({
  target,
  onClose,
  onShowLeaderboard,
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative bg-slate-900 border-2 border-amber-500 p-8 rounded-xl text-center max-w-sm w-full">

        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-slate-400 hover:text-white p-2"
        >
          ✕
        </button>

        <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-t from-amber-600 to-yellow-300 mb-4 uppercase">
          Victoire !
        </h2>

        <div className="w-32 h-32 mx-auto mb-4 rounded-full p-1 bg-gradient-to-b from-amber-400 to-amber-700">
          <AdminImage
            id={target.id}
            name={target.name}
            className="w-full h-full rounded-full object-cover border-4 border-slate-900"
          />
        </div>

        <p className="text-slate-300 mb-4">
          Bravo ! L'admin du jour était
          <span className="block text-white font-bold text-xl mt-1">
            {target.name}
          </span>
        </p>

        <div className="text-sm text-slate-500 mt-4 border-t border-slate-700 pt-4">
          Prochain admin dans : <br/>
          <CountdownToMidnight />
        </div>

        <button
          onClick={onShowLeaderboard}
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
          Voir le classement
        </button>

      </div>
    </div>
  );
}
