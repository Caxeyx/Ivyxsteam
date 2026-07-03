import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // API routes FIRST
  app.get("/api/movies", async (req, res) => {
    try {
      const query = req.query.q as string;
      
      let url = `https://api.tvmaze.com/shows`; // popular shows
      if (query) {
        url = `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`;
      }

      const tvMazeRes = await fetch(url);
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
      // Fetch games and teams from worldcup26.ir
      const [gamesRes, teamsRes] = await Promise.all([
        fetch('https://worldcup26.ir/get/games'),
        fetch('https://worldcup26.ir/get/teams')
      ]);
      
      const gamesData = await gamesRes.json();
      const teamsData = await teamsRes.json();
      const games = gamesData.games || [];
      const teams = teamsData.teams || [];
      
      // Create team map for easy lookup
      const teamMap = new Map();
      teams.forEach((t: any) => {
        teamMap.set(t.id, t);
      });
      
      // Parse dates and determine what is live/upcoming. Since this is for WC2026, 
      // we'll just mock current date if it's not during the WC, but let's just return all of them
      // and let the frontend figure it out, or we can fake "live" matches for demo if needed.
      
      const matches = games.map((game: any) => {
        const homeTeam = teamMap.get(game.home_team_id) || {};
        const awayTeam = teamMap.get(game.away_team_id) || {};
        
        let status = 'SCHEDULED';
        if (game.time_elapsed === 'finished') status = 'FINISHED';
        else if (game.time_elapsed !== 'notstarted' && game.time_elapsed) status = 'IN_PLAY';
        
        // Convert "MM/DD/YYYY HH:mm" to ISO
        // Note: game.local_date e.g., "06/11/2026 13:00"
        let utcDate = new Date().toISOString();
        if (game.local_date) {
           const [datePart, timePart] = game.local_date.split(' ');
           if (datePart && timePart) {
             const [mm, dd, yyyy] = datePart.split('/');
             utcDate = new Date(`${yyyy}-${mm}-${dd}T${timePart}:00.000-05:00`).toISOString(); // assuming EST/CDT, just use offset
           }
        }
        
        return {
          id: parseInt(game.id),
          utcDate,
          status,
          homeTeam: { 
            id: parseInt(game.home_team_id), 
            name: game.home_team_name_en || game.home_team_label, 
            shortName: homeTeam.fifa_code || game.home_team_name_en?.substring(0,3).toUpperCase(), 
            crest: homeTeam.flag 
          },
          awayTeam: { 
            id: parseInt(game.away_team_id), 
            name: game.away_team_name_en || game.away_team_label, 
            shortName: awayTeam.fifa_code || game.away_team_name_en?.substring(0,3).toUpperCase(), 
            crest: awayTeam.flag 
          },
          score: {
            fullTime: { 
              home: game.home_score !== undefined && game.home_score !== "null" ? parseInt(game.home_score) : null, 
              away: game.away_score !== undefined && game.away_score !== "null" ? parseInt(game.away_score) : null 
            }
          },
          scorers: {
            home: game.home_scorers !== "null" && game.home_scorers ? game.home_scorers.replace(/[\{\}“”"]/g, '').split(',') : [],
            away: game.away_scorers !== "null" && game.away_scorers ? game.away_scorers.replace(/[\{\}“”"]/g, '').split(',') : []
          },
          minute: game.time_elapsed !== 'notstarted' && game.time_elapsed !== 'finished' ? game.time_elapsed : undefined,
          competition: { id: 2026, name: "FIFA World Cup 2026", emblem: "" },
          stage: game.group,
          venue: game.stadium_id // we can map stadium later if needed
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
      const [gamesRes, stadiumsRes] = await Promise.all([
        fetch('https://worldcup26.ir/get/games'),
        fetch('https://worldcup26.ir/get/stadiums')
      ]);
      const gamesData = await gamesRes.json();
      const stadiumsData = await stadiumsRes.json();
      const games = gamesData.games || [];
      const stadiums = stadiumsData.stadiums || [];
      
      const game = games.find((g: any) => g.id === id);
      if (!game) return res.status(404).json({ error: "Match not found" });
      
      const stadium = stadiums.find((s: any) => s.id === game.stadium_id);
      
      res.json({
        id: game.id,
        venue: stadium ? `${stadium.name_en}, ${stadium.city_en}` : null,
        stage: game.group,
        score: {
          halfTime: { home: null, away: null },
          fullTime: { 
            home: game.home_score !== undefined && game.home_score !== "null" ? parseInt(game.home_score) : null, 
            away: game.away_score !== undefined && game.away_score !== "null" ? parseInt(game.away_score) : null 
          }
        },
        scorers: {
          home: game.home_scorers !== "null" && game.home_scorers ? game.home_scorers.replace(/[\{\}“”"]/g, '').split(',') : [],
          away: game.away_scorers !== "null" && game.away_scorers ? game.away_scorers.replace(/[\{\}“”"]/g, '').split(',') : []
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch match details" });
    }
  });

  app.get("/api/competitions/:id/standings", async (req, res) => {
    try {
      const [groupsRes, teamsRes] = await Promise.all([
        fetch('https://worldcup26.ir/get/groups'),
        fetch('https://worldcup26.ir/get/teams')
      ]);
      const groupsData = await groupsRes.json();
      const teamsData = await teamsRes.json();
      const groups = groupsData.groups || [];
      const teams = teamsData.teams || [];
      
      const teamMap = new Map();
      teams.forEach((t: any) => teamMap.set(t.id, t));
      
      // format to match football-data structure
      const standings = groups.map((g: any) => ({
        stage: 'GROUP_STAGE',
        type: 'TOTAL',
        group: `GROUP_${g.letter}`,
        table: g.teams.map((t: any, index: number) => {
          const teamDetails = teamMap.get(t.team_id) || {};
          return {
            position: index + 1,
            team: {
              id: parseInt(t.team_id),
              name: teamDetails.name_en,
              shortName: teamDetails.fifa_code,
              crest: teamDetails.flag
            },
            playedGames: parseInt(t.played),
            won: parseInt(t.won),
            draw: parseInt(t.drawn),
            lost: parseInt(t.lost),
            points: parseInt(t.pts),
            goalsFor: parseInt(t.gf),
            goalsAgainst: parseInt(t.ga),
            goalDifference: parseInt(t.gd)
          };
        })
      }));
      
      res.json({ standings });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch standings" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
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
