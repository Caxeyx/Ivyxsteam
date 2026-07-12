import express from "express";
import path from "path";
import vm from "vm";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  // API routes FIRST
  app.get("/ads.txt", (req, res) => {
    res.type("text/plain");
    res.send("google.com, pub-9109346034857171, DIRECT, f08c47fec0942fa0");
  });

  app.get("/api/movies", async (req, res) => {
    try {
      const query = req.query.q as string;
      
      let url = `https://api.tvmaze.com/shows`; // popular shows
      if (query) {
        url = `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`;
      }

      const tvMazeRes = await fetch(url);
      if (!tvMazeRes.ok) throw new Error(`TVMaze API returned status ${tvMazeRes.status}`);
      const contentType = tvMazeRes.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("TVMaze API did not return JSON");
      }
      const data = await tvMazeRes.json();
      
      let movies = [];
      if (query) {
         movies = data.map((item: any) => ({
          id: item.show.id,
          title: item.show.name,
          posterUrl: item.show.image?.original || item.show.image?.medium || null,
          overview: item.show.summary ? item.show.summary.replace(/<[^>]+>/g, '') : '',
          releaseDate: item.show.premiered,
          voteAverage: item.show.rating?.average || null,
          imdbId: item.show.externals?.imdb || null
        }));
      } else {
         // The /shows endpoint returns a massive array, let's just slice the first 50
         movies = data.slice(0, 50).map((show: any) => ({
          id: show.id,
          title: show.name,
          posterUrl: show.image?.original || show.image?.medium || null,
          overview: show.summary ? show.summary.replace(/<[^>]+>/g, '') : '',
          releaseDate: show.premiered,
          voteAverage: show.rating?.average || null,
          imdbId: show.externals?.imdb || null
        }));
      }
      
      res.json({ movies });
    } catch (error) {
      console.error("API Error:", error);
      res.status(500).json({ error: "Failed to fetch items" });
    }
  });
  app.get("/api/sources", async (req, res) => {
    try {
      const imdbId = req.query.imdbId as string;
      if (!imdbId) return res.status(400).json({ error: "Missing imdbId" });
      
      const watchmodeKey = process.env.WATCHMODE_API_KEY;
      if (!watchmodeKey) {
        // mock
        return res.json({
          sources: [
            { name: "Netflix", type: "sub", web_url: "https://netflix.com" },
            { name: "Hulu", type: "sub", web_url: "https://hulu.com" },
            { name: "Prime Video", type: "buy", web_url: "https://amazon.com" }
          ]
        });
      }
      
      const { WatchmodeClient } = await import('@watchmode/api-client');
      const client = new WatchmodeClient({ apiKey: watchmodeKey });
      
      // we can pass IMDB ID directly to getSources (e.g. tt1234567) or get details first
      const { data: sources, error } = await client.title.getSources(imdbId, { regions: 'US' });
      if (error) {
         console.error("Watchmode API Error:", error);
         return res.status(500).json({ error: "Failed to fetch sources" });
      }

      // Filter and format sources
      const formattedSources = (sources || []).map((s: any) => ({
        name: s.name,
        type: s.type, // sub, rent, buy, free
        web_url: s.web_url,
        price: s.price,
        format: s.format
      }));
      
      res.json({ sources: formattedSources });
    } catch (error) {
      console.error("Sources API Error:", error);
      res.status(500).json({ error: "Failed to fetch sources" });
    }
  });

  app.get("/api/matches", async (req, res) => {
    try {
      // WC2022 Men's matches
      const response = await fetch('https://api.fifa.com/api/v3/calendar/matches?idCompetition=17&idSeason=255711&count=100');
      if (!response.ok) throw new Error("Failed to fetch matches from FIFA");
      
      const data = await response.json();
      const results = data.Results || [];
      
      const matches = results.map((game: any) => {
        let status = 'SCHEDULED';
        if (game.MatchStatus === 0 && game.HomeTeamScore !== null) status = 'FINISHED';
        else if (game.MatchStatus === 3 || game.MatchStatus === 1) status = 'IN_PLAY'; 

        const homeName = game.Home?.TeamName?.[0]?.Description || "TBD";
        const awayName = game.Away?.TeamName?.[0]?.Description || "TBD";
        const homeFlag = game.Home?.PictureUrl ? game.Home.PictureUrl.replace('{format}', 'sq').replace('{size}', '2') : "";
        const awayFlag = game.Away?.PictureUrl ? game.Away.PictureUrl.replace('{format}', 'sq').replace('{size}', '2') : "";

        return {
          id: parseInt(game.IdMatch) || Math.random(),
          utcDate: game.Date,
          status,
          homeTeam: { 
            id: parseInt(game.Home?.IdTeam) || 0,
            name: homeName, 
            shortName: game.Home?.Abbreviation || homeName.substring(0,3).toUpperCase(),
            crest: homeFlag
          },
          awayTeam: { 
            id: parseInt(game.Away?.IdTeam) || 0,
            name: awayName, 
            shortName: game.Away?.Abbreviation || awayName.substring(0,3).toUpperCase(),
            crest: awayFlag
          },
          score: {
            fullTime: { 
              home: game.HomeTeamScore !== null ? game.HomeTeamScore : null,
              away: game.AwayTeamScore !== null ? game.AwayTeamScore : null
            }
          },
          scorers: { home: [], away: [] },
          minute: game.MatchTime ? game.MatchTime.replace("'", "") : undefined,
          competition: { id: parseInt(game.IdCompetition) || 17, name: game.CompetitionName?.[0]?.Description || "FIFA World Cup", emblem: "" },
          stage: game.GroupName?.[0]?.Description || game.StageName?.[0]?.Description || "",
          venue: game.Stadium?.Name?.[0]?.Description || ""
        };
      });
      
      res.json({ matches });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch matches" });
    }
  });

  app.get("/api/matches/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const response = await fetch(`https://api.fifa.com/api/v3/calendar/matches?idCompetition=17&idSeason=255711&count=100`);
      if (!response.ok) throw new Error("Failed to fetch matches from FIFA");
      
      const data = await response.json();
      const results = data.Results || [];
      const game = results.find((m: any) => m.IdMatch === id);
      
      if (!game) return res.status(404).json({ error: "Match not found" });
      
      res.json({
        id: parseInt(game.IdMatch),
        venue: game.Stadium?.Name?.[0]?.Description || null,
        stage: game.GroupName?.[0]?.Description || game.StageName?.[0]?.Description || "",
        score: {
          halfTime: { home: null, away: null },
          fullTime: { 
            home: game.HomeTeamScore !== null ? game.HomeTeamScore : null,
            away: game.AwayTeamScore !== null ? game.AwayTeamScore : null
          }
        },
        scorers: {
          home: [],
          away: []
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch match details" });
    }
  });

  app.get("/api/competitions/:id/standings", async (req, res) => {
    try {
      const response = await fetch('https://api.fifa.com/api/v3/calendar/17/255711/285063/Standing');
      if (!response.ok) throw new Error("Failed to fetch standings");
      
      const data = await response.json();
      const results = data.Results || [];
      
      const groupsMap = new Map();
      results.forEach((row: any) => {
        const groupName = row.Group?.[0]?.Description || "Group";
        if (!groupsMap.has(groupName)) {
          groupsMap.set(groupName, []);
        }
        groupsMap.get(groupName).push(row);
      });
      
      const standings = Array.from(groupsMap.entries()).map(([groupName, teams]: [string, any[]]) => {
        // Sort teams by Position
        teams.sort((a, b) => (a.Position || 0) - (b.Position || 0));
        
        return {
          stage: 'GROUP_STAGE',
          type: 'TOTAL',
          group: groupName,
          table: teams.map((t: any) => {
            const teamName = t.Team?.Name?.[0]?.Description || "TBD";
            const teamFlag = t.Team?.PictureUrl ? t.Team.PictureUrl.replace('{format}', 'sq').replace('{size}', '2') : "";
            
            return {
              position: t.Position,
              team: {
                id: parseInt(t.IdTeam) || 0,
                name: teamName,
                shortName: t.Team?.Abbreviation || teamName.substring(0,3).toUpperCase(),
                crest: teamFlag
              },
              playedGames: t.Played,
              won: t.Won,
              draw: t.Drawn,
              lost: t.Lost,
              points: t.Points,
              goalsFor: t.For,
              goalsAgainst: t.Against,
              goalDifference: t.GoalsDiference
            };
          })
        };
      });
      
      // Sort groups alphabetically (e.g. Group A, Group B)
      standings.sort((a, b) => a.group.localeCompare(b.group));
      
      res.json({ standings });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch standings" });
    }
  });

  // Caching configuration for live channels scraping
  let cachedLiveMap: Record<string, string> = {};
  let lastScrapeTime = 0;
  let isScraping = false;
  const CACHE_TTL = 3 * 60 * 1000; // 3 minutes

  // Trigger cache refresh in the background
  async function triggerScrape() {
    if (isScraping) return;
    isScraping = true;
    try {
      console.log("[Scraper] Starting background live channels scrape...");
      const start = Date.now();
      const freshMap = await getLiveChannelsMap();
      cachedLiveMap = freshMap;
      lastScrapeTime = Date.now();
      console.log(`[Scraper] Scrape completed in ${Date.now() - start}ms`);
    } catch (err) {
      console.error("[Scraper] Background scrape failed:", err);
    } finally {
      isScraping = false;
    }
  }

  // Pre-seed the cache on server startup
  triggerScrape();

  // Helper to scrape active match channels from timstreams in parallel
  async function getLiveChannelsMap() {
    const map: Record<string, string> = {};
    try {
      const homeRes = await fetch("https://timstreams.live/", {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
        }
      });
      if (!homeRes.ok) return map;
      const homeHtml = await homeRes.text();
      
      const matchRegex = /\/match\/[a-zA-Z0-9-]+/g;
      const matches = Array.from(new Set(homeHtml.match(matchRegex) || []));
      
      console.log(`[Scraper] Found ${matches.length} matches to scrape in parallel.`);
      
      await Promise.all(matches.map(async (matchPath) => {
        try {
          const matchRes = await fetch(`https://timstreams.live${matchPath}`, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
            }
          });
          if (!matchRes.ok) return;
          const matchHtml = await matchRes.text();
          
          const watchRegex = /\/watch\/([a-zA-Z0-9-]+)/g;
          let match;
          while ((match = watchRegex.exec(matchHtml)) !== null) {
            const watchPath = match[1];
            const lower = watchPath.toLowerCase();
            
            let channelKey = "";
            if (lower.startsWith("fox-4k")) channelKey = "fox4k";
            else if (lower.startsWith("fox")) channelKey = "fox";
            else if (lower.startsWith("bbc") || lower.startsWith("uk")) channelKey = "bbc";
            else if (lower.startsWith("tsn4k")) channelKey = "tsn4k";
            else if (lower.startsWith("tsn")) channelKey = "tsn";
            else if (lower.startsWith("bein4k") || lower.startsWith("bein-sports-4k")) channelKey = "bein4k";
            else if (lower.startsWith("bein")) channelKey = "bein";
            else if (lower.startsWith("telemundo-4k")) channelKey = "telemundo4k";
            else if (lower.startsWith("telemundo")) channelKey = "telemundo";
            else if (lower.startsWith("fussball")) channelKey = "fussball4k";
            
            if (channelKey && !map[channelKey]) {
              map[channelKey] = `https://www.timstreams.one/embed/${watchPath}`;
            }
          }
        } catch (err) {
          console.error(`[Scraper] Error parsing match ${matchPath}:`, err);
        }
      }));
    } catch (e) {
      console.error("[Scraper] Error fetching live channels:", e);
    }
    return map;
  }

  const FALLBACK_MAP: Record<string, string> = {
    "fox": "https://xyzstreams.st/wc-1-embed.html",
    "fox4k": "https://xyzstreams.st/wc-5-embed.html",
    "bbc": "https://xyzstreams.st/wc-3-embed.html",
    "tsn": "https://xyzstreams.st/wc-7-embed.html",
    "tsn4k": "https://xyzstreams.st/wc-8-embed.html",
    "bein": "https://xyzstreams.st/wc-17-embed.html",
    "bein4k": "https://xyzstreams.st/wc-10-embed.html",
    "beinfr": "https://xyzstreams.st/wc-22-embed.html",
    "telemundo": "https://xyzstreams.st/wc-6-embed.html",
    "telemundo4k": "https://xyzstreams.st/wc-6-embed.html",
    "fussball4k": "https://xyzstreams.st/wc-14-embed.html",
  };

  let cachedHindiUrl = "https://mpd26wc64.blogspot.com/p/matchday01.html";
  let lastHindiScrape = 0;

  async function getHindiChannelUrl(): Promise<string> {
    if (Date.now() - lastHindiScrape < 3 * 60 * 1000) { // 3 min cache
      return cachedHindiUrl;
    }
    try {
      console.log("[Scraper] Scraping Hindi channel stream URL...");
      const res = await fetch("https://mpd26wc64.blogspot.com/p/matchday01.html", {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
        },
        signal: AbortSignal.timeout(5000)
      });
      if (res.ok) {
        const html = await res.text();
        const match = html.match(/src="(https:\/\/krxplor\.github\.io\/plyr\/\?x=[^"]+)"/i);
        if (match && match[1]) {
          cachedHindiUrl = match[1];
          lastHindiScrape = Date.now();
          console.log("[Scraper] Resolved Hindi channel URL:", cachedHindiUrl);
          return cachedHindiUrl;
        }
      }
    } catch (err) {
      console.error("[Scraper] Failed to scrape Hindi channel:", err);
    }
    return cachedHindiUrl;
  }

  app.get("/api/live-channels", async (req, res) => {
    try {
      if (Date.now() - lastScrapeTime > CACHE_TTL) {
        triggerScrape();
      }
      
      if (Object.keys(cachedLiveMap).length === 0) {
        await triggerScrape();
      }

      const result: Record<string, string> = {};
      for (const key of Object.keys(FALLBACK_MAP)) {
        result[key] = cachedLiveMap[key] || FALLBACK_MAP[key];
      }

      // Dynamic Hindi channel
      result["hindi"] = await getHindiChannelUrl();

      res.json(result);
    } catch (e) {
      console.error(e);
      const fallbackResult = { ...FALLBACK_MAP, hindi: cachedHindiUrl };
      res.json(fallbackResult);
    }
  });

  // Generic HLS stream proxy for World Cup channels
  const STREAM_REFERER = "https://xyzstreams-6h9.pages.dev/worldcup26-1-0710";
  const STREAM_ORIGIN = "https://xyzstreams-6h9.pages.dev";
  const PLAYER_REFERER = "https://player.xyzstreams.st/";
  const PLAYER_ORIGIN = "https://player.xyzstreams.st";

  const EMBED_MAP: Record<string, string> = {
    "fox": "fox-xyz-waUvqaAA",
    "fox4k": "fox4k-usa",
    "bbc": "bbcone-uk",
    "tsn": "tsn1-xyz-waUvqaAACr",
    "tsn4k": "tsn4k-xyz-waUvqaAACr",
    "bein": "bein-xyz-waUvqaAAC",
    "bein4k": "bein4k-xyz-waUvqaAAC",
    "beinfr": "bein12fr-xyz",
    "telemundo": "telemundo-xyz-waUvqaAACr",
    "telemundo4k": "telemundo-xyz-waUvqaAACr",
    "fussball4k": "fussballtv1uhd-de"
  };

  const resolvedUrlsCache: Record<string, { url: string; expiresAt: number }> = {};
  const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes cache

  async function resolveStreamUrl(channel: string): Promise<string> {
    const embedId = EMBED_MAP[channel];
    if (!embedId) {
      throw new Error(`Channel ${channel} not mapped`);
    }

    const cached = resolvedUrlsCache[channel];
    if (cached && Date.now() < cached.expiresAt) {
      console.log(`[Proxy] Using cached stream URL for ${channel}`);
      return cached.url;
    }

    let lastError: any = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`[Proxy] Resolving stream URL for ${channel} (embedId: ${embedId}), attempt ${attempt}...`);
        const embedUrl = `https://player.xyzstreams.st/embed/${embedId}`;
        
        const res = await fetch(embedUrl, {
          signal: AbortSignal.timeout(5000),
          headers: {
            "Referer": STREAM_REFERER,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
          }
        });
        if (!res.ok) {
          throw new Error(`Failed to fetch embed page: status ${res.status}`);
        }
        const html = await res.text();
        
        // Find the script starting with "(function(_0x"
        const scriptStart = html.indexOf("(function(_0x");
        if (scriptStart === -1) {
          throw new Error("Obfuscated start pattern not found in HTML");
        }
        
        const openTagIndex = html.lastIndexOf("<script", scriptStart);
        const closeTagIndex = html.indexOf("</script>", scriptStart);
        
        if (openTagIndex === -1 || closeTagIndex === -1) {
          throw new Error("Script tags enclosing the pattern not found");
        }
        
        const contentStart = html.indexOf(">", openTagIndex) + 1;
        const scriptContent = html.substring(contentStart, closeTagIndex);

        let playerOptions: any = null;

        const mockWindow = {
          location: {
            href: embedUrl,
            hostname: "player.xyzstreams.st",
            pathname: `/embed/${embedId}`,
            search: ""
          },
          navigator: {
            userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
          },
          setTimeout: () => {},
          setInterval: () => {},
          clearTimeout: () => {},
          clearInterval: () => {},
          console: { log: () => {}, error: () => {} }, // suppress console output
          eval: eval
        };

        const mockDocument = {
          referrer: STREAM_REFERER,
          getElementById: (id: string) => {
            return {
              addEventListener: () => {},
              classList: { add: () => {}, remove: () => {} },
              style: {}
            };
          },
          addEventListener: () => {},
          createElement: () => ({
            setAttribute: () => {},
            appendChild: () => {},
            style: {}
          }),
          querySelector: () => null,
          querySelectorAll: () => []
        };

        const context = {
          window: mockWindow,
          document: mockDocument,
          navigator: mockWindow.navigator,
          location: mockWindow.location,
          setTimeout: mockWindow.setTimeout,
          setInterval: mockWindow.setInterval,
          clearTimeout: mockWindow.clearTimeout,
          clearInterval: mockWindow.clearInterval,
          console: { log: () => {}, error: () => {} },
          Clappr: new Proxy({
            Player: function(options: any) {
              playerOptions = options;
              const dummyFunc = (...args: any[]) => {
                return dummyProxy;
              };
              const dummyProxy = new Proxy(dummyFunc, {
                get: (target: any, prop: string) => {
                  if (prop === 'options') return options;
                  if (prop === 'then') return undefined;
                  return (...args: any[]) => {
                    if (prop === 'configure' || prop === 'load') {
                      if (typeof args[0] === 'string') {
                        if (!playerOptions) playerOptions = {};
                        playerOptions.source = args[0];
                      } else if (args[0] && typeof args[0] === 'object') {
                        playerOptions = Object.assign(playerOptions || {}, args[0]);
                      }
                    }
                    return dummyProxy;
                  };
                }
              });
              return dummyProxy;
            }
          }, {
            get: (target: any, prop: string) => {
              if (prop in target) return target[prop];
              return new Proxy({}, {
                get: (t: any, p: string) => p
              });
            }
          })
        };
        (context.window as any).window = context;
        (context.window as any).document = mockDocument;

        vm.createContext(context);
        vm.runInContext(scriptContent, context);

        const streamUrl = playerOptions?.source;
        if (!streamUrl) {
          throw new Error("Could not extract stream source URL from player options");
        }

        console.log(`[Proxy] Successfully resolved stream URL for ${channel} on attempt ${attempt}: ${streamUrl}`);
        resolvedUrlsCache[channel] = {
          url: streamUrl,
          expiresAt: Date.now() + CACHE_DURATION
        };
        
        return streamUrl;
      } catch (err: any) {
        console.error(`[Proxy] Attempt ${attempt} failed: ${err.message}`);
        lastError = err;
        // Wait 150ms before retrying
        await new Promise(r => setTimeout(r, 150));
      }
    }
    
    throw lastError || new Error(`Failed to resolve stream URL for ${channel} after 3 attempts`);
  }

  app.get("/api/proxy/stream/:channel", async (req, res) => {
    try {
      const channel = req.params.channel.replace('.m3u8', '');
      const streamUrl = await resolveStreamUrl(channel);

      const response = await fetch(streamUrl, {
        headers: {
          "Referer": PLAYER_REFERER,
          "Origin": PLAYER_ORIGIN,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
        }
      });
      if (!response.ok) {
        return res.status(response.status).send("Failed to fetch stream");
      }
      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Headers", "*");
      let text = await response.text();
      
      // Rewrite all URIs in the playlist to go through our proxy
      const baseUrl = streamUrl.substring(0, streamUrl.lastIndexOf('/') + 1);
      const lines = text.split('\n');
      const rewrittenLines = lines.map(line => {
        const trimmed = line.trim();
        if (trimmed.length === 0) return line;
        if (trimmed.startsWith('#')) {
          return trimmed.replace(/URI=["'](https?:\/\/[^"']+)["']/g, (m, uri) => {
            return `URI="/api/proxy/segment?url=${encodeURIComponent(uri)}"`;
          });
        }
        let fullUrl = trimmed;
        if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
          fullUrl = baseUrl + trimmed;
        }
        return `/api/proxy/segment?url=${encodeURIComponent(fullUrl)}`;
      });
      text = rewrittenLines.join('\n');
      
      res.send(text);
    } catch (error) {
      console.error("Stream proxy error:", error);
      res.status(500).json({ error: "Failed to proxy stream" });
    }
  });

  // Proxy for individual .ts video segments and sub-playlists
  app.get("/api/proxy/segment", async (req, res) => {
    try {
      const segmentUrl = req.query.url as string;
      if (!segmentUrl) {
        return res.status(400).send("Missing url parameter");
      }

      const response = await fetch(segmentUrl, {
        headers: {
          "Referer": PLAYER_REFERER,
          "Origin": PLAYER_ORIGIN,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
        }
      });
      if (!response.ok) {
        return res.status(response.status).send("Failed to fetch segment");
      }
      
      const contentType = response.headers.get("content-type");
      if (contentType) {
        res.setHeader("Content-Type", contentType);
      }
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Headers", "*");
      
      // If it's a sub-playlist (.m3u8), rewrite URLs inside it too
      if (segmentUrl.includes('.m3u8')) {
        let text = await response.text();
        const baseUrl = segmentUrl.substring(0, segmentUrl.lastIndexOf('/') + 1);
        const lines = text.split('\n');
        const rewrittenLines = lines.map(line => {
          const trimmed = line.trim();
          if (trimmed.length === 0) return line;
          if (trimmed.startsWith('#')) {
            return trimmed.replace(/URI=["'](https?:\/\/[^"']+)["']/g, (m, uri) => {
              return `URI="/api/proxy/segment?url=${encodeURIComponent(uri)}"`;
            });
          }
          let fullUrl = trimmed;
          if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
            fullUrl = baseUrl + trimmed;
          }
          return `/api/proxy/segment?url=${encodeURIComponent(fullUrl)}`;
        });
        text = rewrittenLines.join('\n');
        res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
        res.send(text);
      } else {
        // Binary segment data - pipe it through
        const buffer = await response.arrayBuffer();
        res.send(Buffer.from(buffer));
      }
    } catch (error) {
      console.error("Segment proxy error:", error);
      res.status(500).send("Failed to proxy segment");
    }
  });

  // Legacy BBC proxy (kept for backward compatibility)
  app.get("/api/proxy/bbc.m3u8", async (req, res) => {
    try {
      const streamUrl = await resolveStreamUrl("bbc");
      const response = await fetch(streamUrl, {
        headers: {
          "Referer": PLAYER_REFERER,
          "Origin": PLAYER_ORIGIN,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
      });
      if (!response.ok) {
        return res.status(response.status).send("Failed to fetch stream");
      }
      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      res.setHeader("Access-Control-Allow-Origin", "*");
      const text = await response.text();
      res.send(text);
    } catch (error) {
      console.error("Proxy error:", error);
      res.status(500).json({ error: "Failed to proxy stream" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
