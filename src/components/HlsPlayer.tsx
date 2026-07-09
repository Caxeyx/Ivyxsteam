import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';

interface HlsPlayerProps {
  url: string;
}

export function HlsPlayer({ url }: HlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let hls: Hls | null = null;
    const video = videoRef.current;

    if (!video) return;

    const fallbackUrl = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";

    const loadSourceWithFallback = (streamUrl: string, isFallback = false): (() => void) | void => {
      if (Hls.isSupported()) {
        if (hls) {
          hls.destroy();
        }
        hls = new Hls({
          maxBufferLength: 30,
          maxMaxBufferLength: 600,
        });
        hls.loadSource(streamUrl);
        hls.attachMedia(video);
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(e => console.log('Autoplay prevented:', e));
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            console.warn(`HLS fatal error: ${data.type}. Attempting recovery/fallback.`);
            if (!isFallback) {
              console.log("Loading fallback HLS stream...");
              loadSourceWithFallback(fallbackUrl, true);
            } else {
              hls?.destroy();
            }
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // For Safari
        video.src = streamUrl;
        
        const errorHandler = () => {
          if (!isFallback) {
            console.log("Primary stream failed on Safari, loading fallback.");
            video.src = fallbackUrl;
            video.play().catch(e => console.log('Autoplay prevented:', e));
          }
        };

        video.addEventListener('error', errorHandler);
        const metadataHandler = () => {
          video.play().catch(e => console.log('Autoplay prevented:', e));
        };
        video.addEventListener('loadedmetadata', metadataHandler);

        return () => {
          video.removeEventListener('error', errorHandler);
          video.removeEventListener('loadedmetadata', metadataHandler);
        };
      }
    };

    const cleanupSafari = loadSourceWithFallback(url);

    return () => {
      if (hls) {
        hls.destroy();
      }
      if (cleanupSafari) {
        cleanupSafari();
      }
    };
  }, [url]);

  return (
    <div className="relative w-full h-full bg-black">
      <video
        ref={videoRef}
        controls
        muted
        className="w-full h-full"
        playsInline
      />
    </div>
  );
}
