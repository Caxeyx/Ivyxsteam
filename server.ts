import express from "express";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

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
      res.json(result);
    } catch (e) {
      console.error(e);
      res.json(FALLBACK_MAP);
    }
  });

  // Generic HLS stream proxy for World Cup channels
  const STREAM_MAP: Record<string, string> = {
    "fox": "https://pacquiao.inproviszon.st/fox-usa.m3u8",
    "fox4k": "https://pacquiao.inproviszon.st/fox4k-usa.m3u8",
    "bbc": "https://pacquiao.inproviszon.st/itv-xyz-waUvqaAAC.m3u8",
    "tsn": "https://pacquiao.inproviszon.st/tsn1-xyz-waUvqaAACr.m3u8",
    "tsn4k": "https://pacquiao.inproviszon.st/tsn4k-xyz-waUvqaAACr.m3u8",
    "bein": "https://pacquiao.inproviszon.st/bein-xyz-waUvqaAAC.m3u8",
    "bein4k": "https://pacquiao.inproviszon.st/bein4k-xyz-waUvqaAAC.m3u8",
    "beinfr": "https://pacquiao.inproviszon.st/bein12fr-xyz.m3u8",
    "telemundo": "https://pacquiao.inproviszon.st/telemundo-xyz-waUvqaAACr.m3u8",
    "telemundo4k": "https://pacquiao.inproviszon.st/telemundo-xyz-waUvqaAACr.m3u8",
    "fussball4k": "https://pacquiao.inproviszon.st/fussballtv1uhd-de.m3u8",
  };

  app.get("/api/proxy/stream/:channel", async (req, res) => {
    try {
      const channel = req.params.channel.replace('.m3u8', '');
      const streamUrl = STREAM_MAP[channel];
      if (!streamUrl) {
        return res.status(404).json({ error: "Channel not found" });
      }

      const response = await fetch(streamUrl, {
        headers: {
          "Referer": "https://xyzstreams-6h9.pages.dev/worldcup26-2-0707",
          "Origin": "https://xyzstreams-6h9.pages.dev",
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
      
      // Rewrite relative segment URLs to go through our proxy
      const baseUrl = streamUrl.substring(0, streamUrl.lastIndexOf('/') + 1);
      text = text.replace(/^(?!#)(?!https?:\/\/)(.+\.ts.*)$/gm, (match) => {
        return `/api/proxy/segment?url=${encodeURIComponent(baseUrl + match)}`;
      });
      text = text.replace(/^(?!#)(?!https?:\/\/)(.+\.m3u8.*)$/gm, (match) => {
        return `/api/proxy/segment?url=${encodeURIComponent(baseUrl + match)}`;
      });
      // Also rewrite absolute URLs from the same host
      text = text.replace(/(https:\/\/(?:[a-zA-Z0-9\-]+\.)?inproviszon\.st\/[^\s"]+)/g, (match) => {
        return `/api/proxy/segment?url=${encodeURIComponent(match)}`;
      });
      
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
          "Referer": "https://xyzstreams-6h9.pages.dev/worldcup26-2-0707",
          "Origin": "https://xyzstreams-6h9.pages.dev",
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
        text = text.replace(/^(?!#)(?!https?:\/\/)(.+\.ts.*)$/gm, (match) => {
          return `/api/proxy/segment?url=${encodeURIComponent(baseUrl + match)}`;
        });
        text = text.replace(/^(?!#)(?!https?:\/\/)(.+\.m3u8.*)$/gm, (match) => {
          return `/api/proxy/segment?url=${encodeURIComponent(baseUrl + match)}`;
        });
        text = text.replace(/(https:\/\/(?:[a-zA-Z0-9\-]+\.)?inproviszon\.st\/[^\s"]+)/g, (match) => {
          return `/api/proxy/segment?url=${encodeURIComponent(match)}`;
        });
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
      const response = await fetch("https://pacquiao.inproviszon.st/bbc-4k.m3u8", {
        headers: {
          "Referer": "https://xyzstreams-6h9.pages.dev/worldcup26-2-0707",
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
