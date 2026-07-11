import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Volume2, VolumeX, RotateCcw, X } from "lucide-react";

interface VikingRowEasterEggProps {
  show: boolean;
  onClose: () => void;
}

interface ConfettiParticle {
  id: number;
  x: number; // percentage (0 to 100)
  color: string;
  delay: number; // seconds
  duration: number; // seconds
  size: number; // pixels
  shape: "rect" | "circle";
  rotate: number; // degrees
}

export function VikingRowEasterEgg({ show, onClose }: VikingRowEasterEggProps) {
  const [isMuted, setIsMuted] = useState(true);
  const [replayKey, setReplayKey] = useState(0);
  const [confetti, setConfetti] = useState<ConfettiParticle[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const soundIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Generate confetti on show or replay
  useEffect(() => {
    if (!show) return;

    const colors = [
      "#FF4081", // IvyxStream pink
      "#6CABDD", // Man City sky blue
      "#BA0C2F", // Norway Red
      "#00205B", // Norway Blue
      "#F4D03F", // Gold / Yellow
      "#FFFFFF", // White
      "#2ECC71", // Green
    ];

    const particles: ConfettiParticle[] = Array.from({ length: 60 }).map((_, i) => ({
      id: i + replayKey * 100,
      x: Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 3,
      duration: 4 + Math.random() * 4,
      size: 6 + Math.random() * 10,
      shape: Math.random() > 0.5 ? "rect" : "circle",
      rotate: Math.random() * 360,
    }));

    setConfetti(particles);
  }, [show, replayKey]);

  // Audio Synthesis for the Viking Drum beat
  const playVikingDrum = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const now = ctx.currentTime;

      // 1. Deep Bass Drum (Viking Kick)
      const kickOsc = ctx.createOscillator();
      const kickGain = ctx.createGain();
      kickOsc.connect(kickGain);
      kickGain.connect(ctx.destination);

      kickOsc.type = "sine";
      kickOsc.frequency.setValueAtTime(110, now); // start at 110Hz
      kickOsc.frequency.exponentialRampToValueAtTime(0.01, now + 0.4);

      kickGain.gain.setValueAtTime(0.7, now);
      kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      kickOsc.start(now);
      kickOsc.stop(now + 0.45);

      // 2. Wood Click/Creak (Oar hitting the side of the boat)
      const clickOsc = ctx.createOscillator();
      const clickGain = ctx.createGain();
      clickOsc.connect(clickGain);
      clickGain.connect(ctx.destination);

      clickOsc.type = "triangle";
      clickOsc.frequency.setValueAtTime(280, now);
      clickOsc.frequency.linearRampToValueAtTime(140, now + 0.08);

      clickGain.gain.setValueAtTime(0.08, now);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      clickOsc.start(now);
      clickOsc.stop(now + 0.09);
    } catch (e) {
      console.error("Failed to play synthesized drum sound", e);
    }
  };

  // Synchronized Sound playing with Rowing rhythm (every 1200ms)
  useEffect(() => {
    if (!show || isMuted) {
      if (soundIntervalRef.current) {
        clearInterval(soundIntervalRef.current);
        soundIntervalRef.current = null;
      }
      return;
    }

    // Play immediately, then every 1200ms
    playVikingDrum();
    soundIntervalRef.current = setInterval(() => {
      playVikingDrum();
    }, 1200);

    return () => {
      if (soundIntervalRef.current) {
        clearInterval(soundIntervalRef.current);
        soundIntervalRef.current = null;
      }
    };
  }, [show, isMuted, replayKey]);

  // Clean up audio context on unmount
  useEffect(() => {
    return () => {
      if (soundIntervalRef.current) {
        clearInterval(soundIntervalRef.current);
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  const handleReplay = () => {
    setReplayKey((prev) => prev + 1);
  };

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden select-none">
          {/* Confetti Canvas / DOM Overlay */}
          <div className="absolute inset-0 z-10 pointer-events-none">
            {confetti.map((p) => (
              <motion.div
                key={p.id}
                initial={{
                  y: "-5vh",
                  x: `${p.x}vw`,
                  opacity: 1,
                  rotate: p.rotate,
                }}
                animate={{
                  y: "105vh",
                  x: [
                    `${p.x}vw`,
                    `${p.x + (Math.random() * 10 - 5)}vw`,
                    `${p.x}vw`,
                  ],
                  rotate: p.rotate + 720,
                }}
                transition={{
                  duration: p.duration,
                  delay: p.delay,
                  ease: "linear",
                }}
                className="absolute"
                style={{
                  width: `${p.size}px`,
                  height: p.shape === "rect" ? `${p.size * 0.6}px` : `${p.size}px`,
                  backgroundColor: p.color,
                  borderRadius: p.shape === "circle" ? "50%" : "2px",
                }}
              />
            ))}
          </div>

          {/* Viking Longship Animation Container */}
          <div className="absolute bottom-[20%] left-0 w-full z-20 pointer-events-none">
            <motion.div
              key={replayKey}
              initial={{ x: "-450px" }}
              animate={{ x: "100vw" }}
              transition={{
                duration: 14,
                ease: "linear",
              }}
              className="w-[400px] h-[250px] relative pointer-events-auto cursor-pointer"
              title="Click to hear Haaland's Viking rowers!"
              onClick={() => {
                if (isMuted) {
                  setIsMuted(false);
                } else {
                  playVikingDrum();
                }
              }}
            >
              {/* Ship bobbing & floating animation container */}
              <motion.div
                animate={{
                  y: [0, -8, 2, -6, 0],
                  rotate: [0, 2, -1, 1, 0],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 2.4,
                  ease: "easeInOut",
                }}
                className="w-full h-full"
              >
                <svg
                  viewBox="0 0 400 200"
                  width="100%"
                  height="100%"
                  className="overflow-visible"
                >
                  <defs>
                    {/* Mast Sail Mask */}
                    <mask id="sail-mask">
                      <path
                        d="M 150 45 Q 200 35 250 45 Q 275 90 240 120 Q 200 130 160 120 Q 125 90 150 45 Z"
                        fill="#ffffff"
                      />
                    </mask>
                    {/* Shadow Filter */}
                    <filter id="drop-shadow" x="-10%" y="-10%" width="120%" height="120%">
                      <feDropShadow dx="2" dy="4" stdDeviation="3" floodOpacity="0.3" />
                    </filter>
                  </defs>

                  {/* Water waves behind the boat */}
                  <path
                    d="M 20 180 Q 70 177 120 180 T 220 180 T 320 180 T 420 180"
                    fill="none"
                    stroke="#5dade2"
                    strokeWidth="3"
                    opacity="0.6"
                    strokeLinecap="round"
                  />

                  {/* Mast Pole */}
                  <line
                    x1="200"
                    y1="150"
                    x2="200"
                    y2="30"
                    stroke="#5c3a21"
                    strokeWidth="6"
                    strokeLinecap="round"
                  />

                  {/* Waving Norwegian Mast Flag */}
                  <g filter="url(#drop-shadow)">
                    <rect x="182" y="16" width="18" height="12" fill="#BA0C2F" rx="1" />
                    {/* White Cross */}
                    <rect x="187" y="16" width="3" height="12" fill="#FFFFFF" />
                    <rect x="182" y="20.5" width="18" height="3" fill="#FFFFFF" />
                    {/* Blue Cross */}
                    <rect x="188" y="16" width="1" height="12" fill="#00205B" />
                    <rect x="182" y="21.5" width="18" height="1" fill="#00205B" />
                  </g>

                  {/* Sail with Manchester City colors (mask applied) */}
                  <g mask="url(#sail-mask)" filter="url(#drop-shadow)">
                    {/* alternating vertical sky blue and white stripes */}
                    <rect x="120" y="20" width="30" height="120" fill="#6CABDD" />
                    <rect x="150" y="20" width="22" height="120" fill="#FFFFFF" />
                    <rect x="172" y="20" width="22" height="120" fill="#6CABDD" />
                    <rect x="194" y="20" width="22" height="120" fill="#FFFFFF" />
                    <rect x="216" y="20" width="22" height="120" fill="#6CABDD" />
                    <rect x="238" y="20" width="22" height="120" fill="#FFFFFF" />
                    <rect x="260" y="20" width="30" height="120" fill="#6CABDD" />
                  </g>

                  {/* Rower Group (bobs out-of-phase with boat/oars) */}
                  <motion.g
                    animate={{
                      y: [0, 4, 0],
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 1.2,
                      ease: "easeInOut",
                    }}
                  >
                    {/* Viking Rower 4 (Back) */}
                    <g transform="translate(145, 120)">
                      {/* Body */}
                      <path d="M -15 15 L 15 15 L 10 35 L -10 35 Z" fill="#78281F" />
                      {/* Head */}
                      <circle cx="0" cy="5" r="9" fill="#F5CBA7" />
                      {/* Grey Beard */}
                      <path d="M -6 11 Q 0 25 6 11 Z" fill="#95A5A6" />
                      {/* Horned Helmet */}
                      <path d="M -10 3 A 10 10 0 0 1 10 3 Z" fill="#7F8C8D" />
                      <path d="M -8 1 Q -15 -10 -20 -3 Q -12 -2 -8 1 Z" fill="#FFF" />
                      <path d="M 8 1 Q 15 -10 20 -3 Q 12 -2 8 1 Z" fill="#FFF" />
                    </g>

                    {/* Viking Rower 3 (Middle Back) */}
                    <g transform="translate(195, 120)">
                      {/* Body */}
                      <path d="M -15 15 L 15 15 L 10 35 L -10 35 Z" fill="#1B4F72" />
                      {/* Head */}
                      <circle cx="0" cy="5" r="9" fill="#EDBB99" />
                      {/* Dark Brown Beard */}
                      <path d="M -6 11 Q 0 25 6 11 Z" fill="#5C3A21" />
                      {/* Horned Helmet */}
                      <path d="M -10 3 A 10 10 0 0 1 10 3 Z" fill="#7B7D7D" />
                      <path d="M -8 1 Q -15 -10 -20 -3 Q -12 -2 -8 1 Z" fill="#FFF" />
                      <path d="M 8 1 Q 15 -10 20 -3 Q 12 -2 8 1 Z" fill="#FFF" />
                    </g>

                    {/* Viking Rower 2 (Middle Front) */}
                    <g transform="translate(245, 120)">
                      {/* Body */}
                      <path d="M -15 15 L 15 15 L 10 35 L -10 35 Z" fill="#1E8449" />
                      {/* Head */}
                      <circle cx="0" cy="5" r="9" fill="#F5CBA7" />
                      {/* Ginger Beard */}
                      <path d="M -6 11 Q 0 25 6 11 Z" fill="#E67E22" />
                      {/* Horned Helmet */}
                      <path d="M -10 3 A 10 10 0 0 1 10 3 Z" fill="#7F8C8D" />
                      <path d="M -8 1 Q -15 -10 -20 -3 Q -12 -2 -8 1 Z" fill="#FFF" />
                      <path d="M 8 1 Q 15 -10 20 -3 Q 12 -2 8 1 Z" fill="#FFF" />
                    </g>

                    {/* Erling Haaland Rower (Bow / Front) */}
                    <g transform="translate(295, 115)">
                      {/* Flowing Blonde Ponytail/Bun */}
                      <path
                        d="M -9 3 Q -24 -2 -22 14 Q -12 12 -9 3 Z"
                        fill="#F4D03F"
                        stroke="#D4AC0D"
                        strokeWidth="1"
                      />
                      <circle cx="-16" cy="7" r="3.5" fill="#F4D03F" />
                      {/* Man City Sky Blue Jersey with Number 9 */}
                      <path d="M -15 18 L 15 18 L 10 38 L -10 38 Z" fill="#6CABDD" />
                      <text
                        x="0"
                        y="32"
                        fill="#FFFFFF"
                        fontSize="9"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        9
                      </text>
                      {/* Haaland Head */}
                      <circle cx="0" cy="7" r="10" fill="#FADBD8" />
                      <path d="M -10 7 Q 0 -8 10 7 Z" fill="#F4D03F" /> {/* Blonde bangs */}
                      {/* Face features (eyes, happy smile) */}
                      <circle cx="-3" cy="7" r="1" fill="#333" />
                      <circle cx="3" cy="7" r="1" fill="#333" />
                      <path d="M -3 11 Q 0 15 3 11" fill="none" stroke="#333" strokeWidth="1" />
                      {/* Horned Helmet */}
                      <path d="M -11 5 A 11 11 0 0 1 11 5 Z" fill="#BDC3C7" stroke="#95A5A6" strokeWidth="0.5" />
                      {/* Golden Horns */}
                      <path d="M -9 3 Q -18 -8 -22 0 Q -14 -1 -9 3 Z" fill="#F1C40F" />
                      <path d="M 9 3 Q 18 -8 22 0 Q 14 -1 9 3 Z" fill="#F1C40F" />
                    </g>
                  </motion.g>

                  {/* Main Wooden Longship Hull */}
                  <g filter="url(#drop-shadow)">
                    {/* Dragon Stern (Left) */}
                    <path
                      d="M 70 140 Q 30 110 40 60 Q 45 50 55 60 Q 48 75 75 125 Z"
                      fill="#8B5A2B"
                      stroke="#5C3A21"
                      strokeWidth="2.5"
                    />
                    {/* Dragon Bow Head (Right) */}
                    <path
                      d="M 330 140 Q 370 110 360 60 Q 355 50 345 60 Q 352 75 325 125 Z"
                      fill="#8B5A2B"
                      stroke="#5C3A21"
                      strokeWidth="2.5"
                    />
                    {/* Dragon eyes on bow */}
                    <circle cx="353" cy="67" r="2.5" fill="#F1C40F" />
                    <circle cx="353" cy="67" r="1" fill="#000" />
                    
                    {/* Longship Hull */}
                    <path
                      d="M 50 140 Q 200 185 350 140 Q 365 110 350 132 Q 200 162 50 132 Q 35 110 50 140 Z"
                      fill="#8B5A2B"
                      stroke="#5C3A21"
                      strokeWidth="3.5"
                    />
                    {/* Wood Planks Lines */}
                    <path
                      d="M 60 141 Q 200 178 340 141"
                      fill="none"
                      stroke="#5C3A21"
                      strokeWidth="1.5"
                      opacity="0.8"
                    />
                    <path
                      d="M 72 147 Q 200 172 328 147"
                      fill="none"
                      stroke="#5C3A21"
                      strokeWidth="1.5"
                      opacity="0.8"
                    />
                  </g>

                  {/* Shield list decoration on the hull side */}
                  {/* Shield 1 (Man City theme) */}
                  <g transform="translate(110, 150)" filter="url(#drop-shadow)">
                    <circle cx="0" cy="0" r="13" fill="#6CABDD" stroke="#5C3A21" strokeWidth="1.5" />
                    <circle cx="0" cy="0" r="8" fill="#FFFFFF" />
                    <circle cx="0" cy="0" r="4" fill="#6CABDD" />
                  </g>
                  {/* Shield 2 (Norway theme) */}
                  <g transform="translate(152, 153)" filter="url(#drop-shadow)">
                    <circle cx="0" cy="0" r="13" fill="#BA0C2F" stroke="#5C3A21" strokeWidth="1.5" />
                    {/* Norway white cross */}
                    <rect x="-13" y="-2" width="26" height="4" fill="#FFFFFF" />
                    <rect x="-2" y="-13" width="4" height="26" fill="#FFFFFF" />
                    {/* Norway blue cross */}
                    <rect x="-13" y="-1" width="26" height="2" fill="#00205B" />
                    <rect x="-1" y="-13" width="2" height="26" fill="#00205B" />
                  </g>
                  {/* Shield 3 (Man City theme) */}
                  <g transform="translate(194, 155)" filter="url(#drop-shadow)">
                    <circle cx="0" cy="0" r="13" fill="#6CABDD" stroke="#5C3A21" strokeWidth="1.5" />
                    <circle cx="0" cy="0" r="8" fill="#FFFFFF" />
                    <circle cx="0" cy="0" r="4" fill="#6CABDD" />
                  </g>
                  {/* Shield 4 (Norway theme) */}
                  <g transform="translate(236, 153)" filter="url(#drop-shadow)">
                    <circle cx="0" cy="0" r="13" fill="#BA0C2F" stroke="#5C3A21" strokeWidth="1.5" />
                    <rect x="-13" y="-2" width="26" height="4" fill="#FFFFFF" />
                    <rect x="-2" y="-13" width="4" height="26" fill="#FFFFFF" />
                    <rect x="-13" y="-1" width="26" height="2" fill="#00205B" />
                    <rect x="-1" y="-13" width="2" height="26" fill="#00205B" />
                  </g>
                  {/* Shield 5 (Man City theme) */}
                  <g transform="translate(278, 150)" filter="url(#drop-shadow)">
                    <circle cx="0" cy="0" r="13" fill="#6CABDD" stroke="#5C3A21" strokeWidth="1.5" />
                    <circle cx="0" cy="0" r="8" fill="#FFFFFF" />
                    <circle cx="0" cy="0" r="4" fill="#6CABDD" />
                  </g>

                  {/* Rotating Oars (synchronized rotation) */}
                  {/* Oar 4 */}
                  <motion.g
                    animate={{ rotate: [-24, 14, -24] }}
                    transition={{
                      repeat: Infinity,
                      duration: 1.2,
                      ease: "easeInOut",
                    }}
                    style={{ transformOrigin: "145px 135px" }}
                  >
                    <line x1="145" y1="135" x2="178" y2="185" stroke="#8B5A2B" strokeWidth="3.5" strokeLinecap="round" />
                    <path d="M 174 180 Q 183 194 179 191 Q 170 188 174 180" fill="#5C3A21" />
                  </motion.g>

                  {/* Oar 3 */}
                  <motion.g
                    animate={{ rotate: [-24, 14, -24] }}
                    transition={{
                      repeat: Infinity,
                      duration: 1.2,
                      ease: "easeInOut",
                    }}
                    style={{ transformOrigin: "195px 135px" }}
                  >
                    <line x1="195" y1="135" x2="228" y2="185" stroke="#8B5A2B" strokeWidth="3.5" strokeLinecap="round" />
                    <path d="M 224 180 Q 233 194 229 191 Q 220 188 224 180" fill="#5C3A21" />
                  </motion.g>

                  {/* Oar 2 */}
                  <motion.g
                    animate={{ rotate: [-24, 14, -24] }}
                    transition={{
                      repeat: Infinity,
                      duration: 1.2,
                      ease: "easeInOut",
                    }}
                    style={{ transformOrigin: "245px 135px" }}
                  >
                    <line x1="245" y1="135" x2="278" y2="185" stroke="#8B5A2B" strokeWidth="3.5" strokeLinecap="round" />
                    <path d="M 274 180 Q 283 194 279 191 Q 270 188 274 180" fill="#5C3A21" />
                  </motion.g>

                  {/* Oar 1 (Haaland's Oar) */}
                  <motion.g
                    animate={{ rotate: [-24, 14, -24] }}
                    transition={{
                      repeat: Infinity,
                      duration: 1.2,
                      ease: "easeInOut",
                    }}
                    style={{ transformOrigin: "295px 135px" }}
                  >
                    <line x1="295" y1="135" x2="328" y2="185" stroke="#8B5A2B" strokeWidth="3.5" strokeLinecap="round" />
                    <path d="M 324 180 Q 333 194 329 191 Q 320 188 324 180" fill="#5C3A21" />
                  </motion.g>

                  {/* Water waves in front of boat */}
                  <path
                    d="M 50 185 Q 110 182 170 185 T 290 185 T 410 185"
                    fill="none"
                    stroke="#2e86c1"
                    strokeWidth="1.5"
                    opacity="0.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 280 187 Q 310 186 340 187 T 400 187"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="1"
                    opacity="0.9"
                    strokeLinecap="round"
                  />
                </svg>
              </motion.div>
            </motion.div>
          </div>

          {/* Bottom Controls Panel (Google Search style) */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md px-5 py-3 rounded-full border border-zinc-200 dark:border-zinc-800 shadow-xl pointer-events-auto z-50">
            {/* Title / Description */}
            <div className="flex items-center gap-2 pr-3 border-r border-zinc-200 dark:border-zinc-800">
              <span className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-1.5 whitespace-nowrap">
                <span className="text-[#FF4081]">Viking Row</span> 👑 Haaland Egg
              </span>
            </div>

            {/* Replay Button */}
            <button
              onClick={handleReplay}
              className="p-2 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-all cursor-pointer"
              title="Replay Rowing Animation"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Mute/Unmute Synthesized Audio */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-all cursor-pointer"
              title={isMuted ? "Unmute Drumbeat" : "Mute Drumbeat"}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-500" /> : <Volume2 className="w-4 h-4 text-green-500" />}
            </button>

            {/* Close Easter Egg */}
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-800 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-all cursor-pointer"
              title="Close Egg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
