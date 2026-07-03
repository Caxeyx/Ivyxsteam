/**
 * Client API utility to support running statically on hosts like GitHub Pages
 * by doing client-side fetching and parsing directly from the APIs when not on localhost.
 */

const isLocal = () => {
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
};

export async function fetchMatches() {
  if (isLocal()) {
    const res = await fetch("/api/matches");
    return res.json();
  }
  const response = await fetch("https://api.fifa.com/api/v3/calendar/matches?idCompetition=17&idSeason=255711&count=100");
  if (!response.ok) throw new Error("Failed to fetch matches from FIFA");
  const data = await response.json();
  const results = data.Results || [];
  const matches = results.map((game: any) => ({
    id: parseInt(game.IdMatch),
    utcDate: game.Date,
    status: game.MatchStatus === 0 ? 'FINISHED' : (game.MatchStatus === 3 ? 'IN_PLAY' : 'SCHEDULED'),
    homeTeam: {
      id: parseInt(game.HomeTeam?.IdTeam) || 0,
      name: game.HomeTeam?.TeamName?.[0]?.Description || "TBD",
      shortName: game.HomeTeam?.Abbreviation || "",
      crest: game.HomeTeam?.PictureUrl ? game.HomeTeam.PictureUrl.replace('{format}', 'sq').replace('{size}', '2') : ""
    },
    awayTeam: {
      id: parseInt(game.AwayTeam?.IdTeam) || 0,
      name: game.AwayTeam?.TeamName?.[0]?.Description || "TBD",
      shortName: game.AwayTeam?.Abbreviation || "",
      crest: game.AwayTeam?.PictureUrl ? game.AwayTeam.PictureUrl.replace('{format}', 'sq').replace('{size}', '2') : ""
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
  }));
  return { matches };
}

export async function fetchMatchDetails(id: number) {
  if (isLocal()) {
    const res = await fetch(`/api/matches/${id}`);
    return res.json();
  }
  const response = await fetch("https://api.fifa.com/api/v3/calendar/matches?idCompetition=17&idSeason=255711&count=100");
  if (!response.ok) throw new Error("Failed to fetch match details");
  const data = await response.json();
  const results = data.Results || [];
  const game = results.find((m: any) => parseInt(m.IdMatch) === id);
  if (!game) throw new Error("Match not found");
  return {
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
    scorers: { home: [], away: [] }
  };
}

export async function fetchStandings(competitionId: number) {
  if (isLocal()) {
    const res = await fetch(`/api/competitions/${competitionId}/standings`);
    return res.json();
  }
  const response = await fetch("https://api.fifa.com/api/v3/calendar/17/255711/285063/Standing");
  if (!response.ok) throw new Error("Failed to fetch standings");
  const data = await response.json();
  const results = data.Results || [];
  const groupsMap = new Map<string, any[]>();
  results.forEach((row: any) => {
    const groupName = row.Group?.[0]?.Description || "Group";
    if (!groupsMap.has(groupName)) {
      groupsMap.set(groupName, []);
    }
    groupsMap.get(groupName)!.push(row);
  });
  const standings = Array.from(groupsMap.entries()).map(([groupName, teams]: [string, any[]]) => {
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
  standings.sort((a, b) => a.group.localeCompare(b.group));
  return { standings };
}

export async function fetchMovies(query = "") {
  if (isLocal()) {
    const url = query ? `/api/movies?q=${encodeURIComponent(query)}` : "/api/movies";
    const res = await fetch(url);
    return res.json();
  }
  let url = `https://api.tvmaze.com/shows`;
  if (query) {
    url = `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`;
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch movies");
  const data = await response.json();
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
  return { movies };
}

export async function fetchSources(imdbId: string) {
  if (isLocal()) {
    const res = await fetch(`/api/sources?imdbId=${imdbId}`);
    return res.json();
  }
  return {
    sources: [
      { name: "Netflix", type: "sub", web_url: "https://netflix.com" },
      { name: "Hulu", type: "sub", web_url: "https://hulu.com" },
      { name: "Prime Video", type: "buy", web_url: "https://amazon.com" }
    ]
  };
}

export function getStreamUrl() {
  return isLocal() 
    ? "/api/proxy/bbc.m3u8" 
    : "https://1657061170.rsc.cdn77.org/HLS/FTF-LINEAR.m3u8";
}

export function getFeaturedVideoInfo() {
  const local = isLocal();
  return {
    title: local ? "BBC 4K" : "FTF Sports Live",
    description: local 
      ? "Watch BBC live in stunning 4K resolution." 
      : "Watch live sports broadcasting in high definition.",
    category: local ? "Live TV" : "Live Sports"
  };
}
