import React, { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    shaka: any;
  }
}

interface ShakaPlayerProps {
  url: string;
  drm?: {
    clearKeys?: Record<string, string>;
  };
}

export function ShakaPlayer({ url, drm }: ShakaPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let player: any = null;
    let isMounted = true;

    const scriptId = "shaka-player-compiled-script";
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    const initPlayer = async () => {
      if (!window.shaka) return;
      
      // Install built-in polyfills to patch browser incompatibilities
      window.shaka.polyfill.installAll();

      if (!window.shaka.Player.isBrowserSupported()) {
        setError("Your browser does not support DASH / DRM playback. Please try another browser like Chrome or Firefox.");
        setLoading(false);
        return;
      }

      if (!videoRef.current) return;

      try {
        player = new window.shaka.Player();
        await player.attach(videoRef.current);

        // Configure DRM if clear keys are provided
        if (drm && drm.clearKeys) {
          player.configure({
            drm: {
              clearKeys: drm.clearKeys,
            }
          });
        }

        // Custom config for smooth streaming and low latency buffering
        player.configure({
          abr: {
            defaultBandwidthEstimate: 10000,
            enabled: true,
            switchInterval: 1
          },
          manifest: {
            defaultPresentationDelay: 4,
            dash: {
              ignoreSuggestedPresentationDelay: true,
              ignoreMinBufferTime: true,
              autoCorrectDrift: true
            }
          },
          streaming: {
            bufferingGoal: 8,
            rebufferingGoal: 2,
            bufferBehind: 10,
            lowLatencyMode: true,
            safeSeekOffset: 4,
            stallThreshold: 1,
            jumpLargeGaps: true
          }
        });

        await player.load(url);
        
        if (isMounted) {
          setLoading(false);
          videoRef.current.play().catch((err) => {
            console.log("Autoplay was prevented by browser security rules:", err);
          });
        }
      } catch (err: any) {
        console.error("Shaka player error:", err);
        if (isMounted) {
          setError(`Playback initialization failed: ${err.message || err.code || "Unknown Error"}`);
          setLoading(false);
        }
      }
    };

    if (!window.shaka) {
      if (!script) {
        script = document.createElement("script");
        script.id = scriptId;
        script.src = "https://cdn.jsdelivr.net/npm/shaka-player@4.16.2/dist/shaka-player.compiled.js";
        script.async = true;
        document.body.appendChild(script);
      }

      const handleScriptLoad = () => {
        if (isMounted) {
          initPlayer();
        }
      };

      script.addEventListener("load", handleScriptLoad);

      // Check periodically in case script was appended but not fully initialized
      const checkInterval = setInterval(() => {
        if (window.shaka) {
          clearInterval(checkInterval);
          initPlayer();
        }
      }, 200);

      return () => {
        isMounted = false;
        clearInterval(checkInterval);
        if (script) {
          script.removeEventListener("load", handleScriptLoad);
        }
        if (player) {
          player.destroy();
        }
      };
    } else {
      initPlayer();
      return () => {
        isMounted = false;
        if (player) {
          player.destroy();
        }
      };
    }
  }, [url, drm]);

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center">
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/90 z-10 space-y-4">
          <div className="w-12 h-12 border-4 border-[#FF4081] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-zinc-400 text-sm font-medium font-mono animate-pulse">Initializing Direct Stream...</p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/95 p-6 text-center z-10 space-y-4">
          <p className="text-[#FF4081] font-semibold text-lg">Stream Unavailable</p>
          <p className="text-xs text-zinc-400 max-w-md leading-relaxed">
            {error}. This stream might be geo-blocked, offline, or your browser may be missing necessary DRM decryption modules.
          </p>
        </div>
      )}

      <video
        ref={videoRef}
        controls
        className="w-full h-full rounded-xl"
        playsInline
      />
    </div>
  );
}
