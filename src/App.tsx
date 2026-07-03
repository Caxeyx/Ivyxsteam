/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { defaultContent, VideoContent } from "./data";
import { Play, Search, Bell, Menu, Home, Compass, Clock, ThumbsUp, Settings, Moon, Sun, Activity, ChevronLeft, ChevronRight, Star, Instagram, Film, Tv } from "lucide-react";
import YouTube from "react-youtube";
import ReactPlayer from "react-player";
import { MagneticButton } from "@/components/ui/magnetic-button";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import { motion } from "motion/react";
import { WinProbability } from "@/components/WinProbability";
import { MatchModal } from "@/components/MatchModal";
import { ShakaPlayer } from "./components/ShakaPlayer";
import { HlsPlayer } from "./components/HlsPlayer";
import * as clientApi from "./lib/clientApi";

export default function App() {
  const [activeVideo, setActiveVideo] = useState<VideoContent>(defaultContent[0]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [matches, setMatches] = useState<{live: any[], upcoming: any[], recent: any[]}>({ live: [], upcoming: [], recent: [] });
  const [expandedMatchId, setExpandedMatchId] = useState<number | null>(null);
  const [matchDetails, setMatchDetails] = useState<Record<number, any>>({});
  const [matchStandings, setMatchStandings] = useState<Record<number, any>>({});
  const [expandedMatchTab, setExpandedMatchTab] = useState<'details' | 'standings'>('details');
  const [favoriteTeams, setFavoriteTeams] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('favoriteTeams');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [activeViewTab, setActiveViewTab] = useState<'Home' | 'Recent' | 'Favorites' | 'Movies' | 'Settings' | 'Channels'>('Home');
  const [updatedMatchIds, setUpdatedMatchIds] = useState<Set<number>>(new Set());
  const [movies, setMovies] = useState<any[]>([]);
  const [movieSearchQuery, setMovieSearchQuery] = useState("");
  const [isMoviesLoading, setIsMoviesLoading] = useState(false);
  const [activeShowImdbId, setActiveShowImdbId] = useState<string | null>(null);
  const [activeShowSources, setActiveShowSources] = useState<any[]>([]);
  const [isLoadingSources, setIsLoadingSources] = useState(false);
  const [activeChannel, setActiveChannel] = useState<{name: string, url: string, type?: string, drm?: any} | null>(null);

  useEffect(() => {
    if (activeShowImdbId) {
      const fetchSources = async () => {
        setIsLoadingSources(true);
        try {
          const data = await clientApi.fetchSources(activeShowImdbId);
          if (data && data.sources) {
            // filter out duplicates by name
            const uniqueSources = data.sources.reduce((acc: any[], current: any) => {
              const x = acc.find(item => item.name === current.name);
              if (!x) {
                return acc.concat([current]);
              } else {
                return acc;
              }
            }, []);
            setActiveShowSources(uniqueSources);
          }
        } catch (e) {
          console.error(e);
        } finally {
          setIsLoadingSources(false);
        }
      };
      fetchSources();
    } else {
      setActiveShowSources([]);
    }
  }, [activeShowImdbId]);



  useEffect(() => {
    localStorage.setItem('favoriteTeams', JSON.stringify(favoriteTeams));
  }, [favoriteTeams]);

  const toggleFavoriteTeam = (e: React.MouseEvent, team: any) => {
    e.stopPropagation();
    if (!team) return;
    setFavoriteTeams(prev => {
      const isFav = prev.find(t => t.id === team.id);
      if (isFav) {
        return prev.filter(t => t.id !== team.id);
      } else {
        return [...prev, team];
      }
    });
  };

  const isTeamFavorite = (teamId?: number) => teamId ? favoriteTeams.some(t => t.id === teamId) : false;

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [hasReadNotifications, setHasReadNotifications] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const liveMatchesRef = useRef<HTMLDivElement>(null);
  const upcomingMatchesRef = useRef<HTMLDivElement>(null);
  const previousLiveScoresRef = useRef<Record<number, string>>({});

  const playVintageBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
      oscillator.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1);

      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.2);
    } catch (e) {
      console.error("Audio playback failed", e);
    }
  };

  useEffect(() => {
    let scoreUpdated = false;
    const currentScores: Record<number, string> = {};
    const newUpdatedMatchIds = new Set<number>();

    matches.live.forEach(match => {
      const scoreString = `${match.score?.fullTime?.home ?? '-'}-${match.score?.fullTime?.away ?? '-'}`;
      currentScores[match.id] = scoreString;

      if (
        previousLiveScoresRef.current[match.id] &&
        previousLiveScoresRef.current[match.id] !== scoreString
      ) {
        newUpdatedMatchIds.add(match.id);
        if (isTeamFavorite(match.homeTeam?.id) || isTeamFavorite(match.awayTeam?.id)) {
          scoreUpdated = true;
        }
      }
    });

    if (newUpdatedMatchIds.size > 0) {
      setUpdatedMatchIds(prev => new Set([...prev, ...newUpdatedMatchIds]));
      setTimeout(() => {
        setUpdatedMatchIds(prev => {
          const updated = new Set(prev);
          newUpdatedMatchIds.forEach(id => updated.delete(id));
          return updated;
        });
      }, 3000);
    }

    if (scoreUpdated && soundEnabled) {
      playVintageBeep();
    }

    previousLiveScoresRef.current = {
      ...previousLiveScoresRef.current,
      ...currentScores
    };
  }, [matches.live, favoriteTeams]);

  const scroll = (ref: React.RefObject<HTMLDivElement>, direction: 'left' | 'right') => {
    if (ref.current) {
      const scrollAmount = 300;
      ref.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  useEffect(() => {
    async function fetchMatches() {
      try {
        const data = await clientApi.fetchMatches();
        if (data && data.matches) {
          const live = data.matches.filter((m: any) => m.status === 'IN_PLAY' || m.status === 'PAUSED');
          const upcoming = data.matches.filter((m: any) => m.status === 'SCHEDULED' || m.status === 'TIMED').sort((a: any, b: any) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime());
          const recent = data.matches.filter((m: any) => m.status === 'FINISHED').sort((a: any, b: any) => new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime());
          setMatches({ live, upcoming, recent });
        }
      } catch (error) {
        console.error("Failed to fetch matches:", error);
      }
    }
    fetchMatches();
    const interval = setInterval(fetchMatches, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function fetchMovies(query = "") {
      setIsMoviesLoading(true);
      try {
        const data = await clientApi.fetchMovies(query);
        if (data && data.movies) {
          setMovies(data.movies);
        }
      } catch (error) {
        console.error("Failed to fetch movies:", error);
      } finally {
        setIsMoviesLoading(false);
      }
    }
    
    // debounce search
    const timeoutId = setTimeout(() => {
      fetchMovies(movieSearchQuery);
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [movieSearchQuery]);

  const handleExpandMatch = async (id: number, competitionId?: number) => {
    if (expandedMatchId === id) {
      setExpandedMatchId(null);
      return;
    }
    setExpandedMatchId(id);
    setExpandedMatchTab('details');
    if (!matchDetails[id]) {
      try {
        const data = await clientApi.fetchMatchDetails(id);
        setMatchDetails(prev => ({ ...prev, [id]: data }));
      } catch (error) {
        console.error("Failed to fetch match details", error);
      }
    }
    if (competitionId && !matchStandings[competitionId]) {
      try {
        const data = await clientApi.fetchStandings(competitionId);
        if (data && data.standings) {
          setMatchStandings(prev => ({ ...prev, [competitionId]: data.standings }));
        }
      } catch (error) {
        console.error("Failed to fetch match standings", error);
      }
    }
  };


  const matchSearchFilter = (m: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.homeTeam?.name?.toLowerCase().includes(q) ||
      m.awayTeam?.name?.toLowerCase().includes(q) ||
      m.competition?.name?.toLowerCase().includes(q)
    );
  };
  
  const teamSearchFilter = (t: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return t.name?.toLowerCase().includes(q) || t.shortName?.toLowerCase().includes(q);
  };

  const filteredContent = defaultContent.filter(c => 
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 flex flex-col md:flex-row w-full font-sans transition-colors duration-300">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen}>
        <SidebarBody className="justify-between gap-10 border-r border-zinc-200 dark:border-zinc-800">
          <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
            <div className="h-16 flex items-center px-1">
              <a
                href="#"
                className="font-normal flex space-x-2 items-center text-sm py-1 relative z-20"
                onClick={(e) => e.preventDefault()}
              >
                <Play className="h-6 w-6 shrink-0 text-[#FF4081] fill-[#FF4081]" />
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{
                    display: sidebarOpen ? "inline-block" : "none",
                    opacity: sidebarOpen ? 1 : 0,
                  }}
                  className="font-black text-xl whitespace-pre tracking-tight"
                >
                  Ivyx<span className="text-[#FF4081]">Stream</span>
                </motion.span>
              </a>
            </div>
            <div className="mt-8 flex flex-col gap-2">
              <SidebarLink link={{ label: "Home", href: "#", icon: <Home className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" /> }} onClick={(e) => { e.preventDefault(); setActiveViewTab('Home'); setSidebarOpen(false); }} />
              <SidebarLink link={{ label: "TV Shows & Movies", href: "#", icon: <Film className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" /> }} onClick={(e) => { e.preventDefault(); setActiveViewTab('Movies'); setSidebarOpen(false); }} />
              <SidebarLink link={{ label: "TV Channels", href: "#", icon: <Tv className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" /> }} onClick={(e) => { e.preventDefault(); setActiveViewTab('Channels'); setSidebarOpen(false); }} />
              <SidebarLink link={{ label: "Recent", href: "#", icon: <Clock className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" /> }} onClick={(e) => { e.preventDefault(); setActiveViewTab('Recent'); setSidebarOpen(false); }} />
              <SidebarLink link={{ label: "Favorites", href: "#", icon: <Star className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" /> }} onClick={(e) => { e.preventDefault(); setActiveViewTab('Favorites'); setSidebarOpen(false); }} />
            </div>
          </div>
          <div>
            <SidebarLink link={{ label: "Settings", href: "#", icon: <Settings className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" /> }} onClick={(e) => { e.preventDefault(); setActiveViewTab('Settings'); setSidebarOpen(false); }} />
          </div>
        </SidebarBody>
      </Sidebar>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-zinc-50 dark:bg-zinc-950 h-screen overflow-hidden relative transition-colors duration-300">
        {/* Header */}
        <header className="h-16 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-6 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 rounded-md cursor-pointer transition-colors md:hidden">
              <Menu className="w-5 h-5" />
            </button>
            <div className="relative hidden sm:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Search matches, teams..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-72 bg-zinc-100 dark:bg-zinc-800/50 border-transparent rounded-full text-sm focus:bg-white dark:focus:bg-zinc-800 focus:border-zinc-300 dark:focus:border-zinc-600 focus:ring-2 focus:ring-[#FF4081]/20 dark:focus:ring-[#FF4081]/20 outline-none transition-all dark:text-zinc-100 dark:placeholder-zinc-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)} 
              className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <div className="relative">
              <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors relative cursor-pointer"
              >
                <Bell className="w-5 h-5" />
                {matches.upcoming.length > 0 && !hasReadNotifications && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-zinc-900"></span>
                )}
              </button>
              
              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden z-50">
                  <div className="p-3 border-b border-zinc-100 dark:border-zinc-800 font-semibold text-sm flex justify-between items-center">
                    <span>Notifications</span>
                    {matches.upcoming.length > 0 && !hasReadNotifications && (
                      <button 
                        onClick={() => setHasReadNotifications(true)}
                        className="text-xs text-[#FF4081] hover:text-[#E91E63] font-medium"
                      >
                        Read All
                      </button>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {matches.upcoming.length > 0 ? (
                      <div className="p-2 space-y-1">
                        {matches.upcoming.filter(matchSearchFilter).slice(0, 5).map(match => (
                          <div key={match.id} className="p-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-lg cursor-pointer transition-colors" onClick={() => {
                            setIsNotificationsOpen(false);
                            document.getElementById('upcoming-matches')?.scrollIntoView({ behavior: 'smooth' });
                          }}>
                            <div className="text-xs text-[#FF4081] font-semibold mb-1">Match Alert</div>
                            <div className="text-sm font-medium flex items-center justify-between">
                              <span className="truncate">{match.homeTeam?.shortName || match.homeTeam?.name}</span>
                              <span className="px-2 text-zinc-400">vs</span>
                              <span className="truncate text-right">{match.awayTeam?.shortName || match.awayTeam?.name}</span>
                            </div>
                            <div className="text-xs text-zinc-500 mt-1">
                              {new Date(match.utcDate).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-sm text-zinc-500">
                        No match alerts
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <a href="https://www.instagram.com/caseyxlive/" target="_blank" rel="noopener noreferrer">
              <MagneticButton>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white text-xs font-semibold shadow-md">
                  <Instagram className="w-4 h-4" />
                  <span className="hidden sm:inline">Follow Casey</span>
                </div>
              </MagneticButton>
            </a>


          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 space-y-8 lg:space-y-10">
          
          {activeViewTab === 'Channels' ? (
            <section className="max-w-6xl mx-auto min-h-[60vh]">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-8 flex items-center gap-2">
                <Tv className="w-6 h-6 text-[#FF4081]" />
                Live TV & Channels
              </h2>
              <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 sm:p-10 ring-1 ring-zinc-200/50 dark:ring-zinc-800/50 shadow-sm">
                <div className="text-center mb-10">
                  <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Tv className="w-8 h-8 text-[#FF4081]" />
                  </div>
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">Open IPTV Channels</h3>
                  <p className="text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed text-sm sm:text-base">
                    Live sports broadcasting rights for premium networks (ESPN, Peacock, etc.) are restricted. Below are some free, open IPTV channels you can stream directly in the browser to test the player functionality.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
                  {[
                    { 
                      name: "FIFA SD", 
                      url: "https://krxplor.github.io/mpd/mpd1.html", 
                      desc: "Live Match (HTML Player)",
                    },
                    { name: "FOX", url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8", desc: "Live Sports & Events (Simulated)" },
                    { name: "Peacock", url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8", desc: "Premier League & More (Simulated)" },
                    { name: "FOX 1", url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8", desc: "Premium Sports (Simulated)" },
                    { name: "NBC Sports", url: "https://d4whmvwm0rdvi.cloudfront.net/10007/99993008/hls/master.m3u8?ads.xumo_channelId=99993008", desc: "Sports News" },
                    { name: "FTF Sports", url: "https://1657061170.rsc.cdn77.org/HLS/FTF-LINEAR.m3u8", desc: "Sports" },
                    { name: "Test Stream (Mux)", url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8", desc: "Testing Player" }
                  ].map((channel, i) => (
                    <button key={i} onClick={() => setActiveChannel(channel)} className="w-full text-left p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-[#FF4081]/50 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-[#FF4081]/5 transition-all group flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-white dark:bg-zinc-900 flex items-center justify-center shrink-0 shadow-sm relative overflow-hidden">
                        <Play className="w-5 h-5 text-zinc-400 group-hover:text-[#FF4081] transition-colors absolute z-10" />
                        <div className="absolute inset-0 bg-[#FF4081]/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      </div>
                      <div>
                        <h4 className="font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-[#FF4081] transition-colors">{channel.name}</h4>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{channel.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          ) : activeViewTab === 'Settings' ? (
            <section className="max-w-4xl mx-auto min-h-[60vh]">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-6 flex items-center gap-2">
                <Settings className="w-6 h-6" />
                Settings
              </h2>
              
              <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm ring-1 ring-zinc-200/50 dark:ring-zinc-800/50 overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800/50">
                
                {/* Theme Setting */}
                <div className="p-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Appearance</h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Switch between light and dark themes.</p>
                  </div>
                  <button 
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                  >
                    {isDarkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                  </button>
                </div>

                {/* Notifications Setting */}
                <div className="p-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Notifications</h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Receive alerts for your favorite teams.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={soundEnabled} onChange={(e) => setSoundEnabled(e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 dark:peer-focus:ring-[#FF4081]/30 rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-[#FF4081]"></div>
                  </label>
                </div>

                {/* Clear Data */}
                <div className="p-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Clear Data</h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Remove all your favorite teams.</p>
                  </div>
                  <button 
                    onClick={() => {
                      if (window.confirm('Are you sure you want to clear your favorite teams?')) {
                        setFavoriteTeams([]);
                      }
                    }}
                    className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-500/10 dark:hover:bg-red-500/20 dark:text-red-400 font-medium rounded-lg transition-colors text-sm"
                  >
                    Clear All
                  </button>
                </div>

              </div>
            </section>
          ) : activeViewTab === 'Favorites' ? (
            <section className="max-w-6xl mx-auto min-h-[60vh]">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-6 flex items-center gap-2">
                <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                Favorite Teams
              </h2>
              {favoriteTeams.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {favoriteTeams.filter(teamSearchFilter).map(team => (
                    <div key={team.id} className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm ring-1 ring-zinc-200/50 dark:ring-zinc-800/50 flex flex-col items-center gap-3 text-center relative group">
                      <button 
                        onClick={(e) => toggleFavoriteTeam(e, team)}
                        className="absolute top-3 right-3 text-yellow-500 hover:text-zinc-400 transition-colors"
                        title="Remove from favorites"
                      >
                        <Star className="w-5 h-5 fill-yellow-500 group-hover:fill-transparent" />
                      </button>
                      <div className="w-20 h-20 rounded-full bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center mb-2 mt-2">
                        {team.crest ? <img src={team.crest} alt={team.name} className="w-12 h-12 object-contain" /> : <Star className="w-8 h-8 text-zinc-300" />}
                      </div>
                      <div className="font-semibold text-lg text-zinc-900 dark:text-zinc-50 leading-tight">{team.name}</div>
                      <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{team.shortName}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center flex flex-col items-center bg-white dark:bg-zinc-900 rounded-2xl shadow-sm ring-1 ring-zinc-200/50 dark:ring-zinc-800/50 p-10">
                  <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-5">
                    <Star className="w-10 h-10 text-zinc-300 dark:text-zinc-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">No favorite teams yet</h3>
                  <p className="text-zinc-500 dark:text-zinc-400 max-w-sm leading-relaxed">
                    Star your favorite teams from the live and upcoming matches to see them here.
                  </p>
                </div>
              )}
            </section>
          ) : activeViewTab === 'Recent' ? (
            <section className="max-w-6xl mx-auto min-h-[60vh]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-500" />
                  Recent Matches
                </h2>
              </div>
              {matches.recent.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {matches.recent.filter(matchSearchFilter).map((match: any) => (
                    <div 
                      key={match.id} 
                      onClick={() => setExpandedMatchId(match.id)}
                      className="bg-white dark:bg-zinc-900 rounded-2xl p-4 shadow-sm ring-1 ring-zinc-200/50 dark:ring-zinc-800/50 flex flex-col gap-4 cursor-pointer hover:ring-indigo-500/50 transition-all group"
                    >
                      <div className="flex justify-between items-center text-xs font-medium text-zinc-500">
                        <span className="truncate max-w-[150px]">{match.competition?.name || "FIFA"}</span>
                        <span>{new Date(match.utcDate).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                      </div>
                      <div className="flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 font-medium text-zinc-900 dark:text-zinc-100">
                              {match.homeTeam?.crest && <img src={match.homeTeam.crest} alt={match.homeTeam.name} className="w-5 h-5 object-contain" />}
                              <span className="truncate max-w-[120px]">{match.status === 'FINISHED' && match.score?.fullTime?.home > match.score?.fullTime?.away && "🏆 "}{match.status === 'FINISHED' && match.score?.fullTime?.home === match.score?.fullTime?.away && match.score?.fullTime?.home !== null && "🤝 "}{match.homeTeam?.shortName || match.homeTeam?.name}</span>
                            </div>
                          </div>
                          <span className="inline-block font-bold text-lg text-zinc-900 dark:text-zinc-50">{match.score?.fullTime?.home ?? '-'}</span>
                        </div>
                        <div className="flex justify-between items-start">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 font-medium text-zinc-900 dark:text-zinc-100">
                              {match.awayTeam?.crest && <img src={match.awayTeam.crest} alt={match.awayTeam.name} className="w-5 h-5 object-contain" />}
                              <span className="truncate max-w-[120px]">{match.status === 'FINISHED' && match.score?.fullTime?.away > match.score?.fullTime?.home && "🏆 "}{match.status === 'FINISHED' && match.score?.fullTime?.away === match.score?.fullTime?.home && match.score?.fullTime?.home !== null && "🤝 "}{match.awayTeam?.shortName || match.awayTeam?.name}</span>
                            </div>
                          </div>
                          <span className="inline-block font-bold text-lg text-zinc-900 dark:text-zinc-50">{match.score?.fullTime?.away ?? '-'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-white dark:bg-zinc-900 rounded-2xl ring-1 ring-zinc-200/50 dark:ring-zinc-800/50">
                  <Clock className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
                  <p className="text-zinc-500 font-medium">No recent matches found.</p>
                </div>
              )}
            </section>
          ) : activeViewTab === 'Movies' ? (
            <section className="max-w-6xl mx-auto min-h-[60vh]">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                  <Film className="w-6 h-6 text-[#FF4081]" />
                  TV Shows & Movies
                </h2>
                <div className="relative max-w-sm w-full">
                  <input
                    type="text"
                    value={movieSearchQuery}
                    onChange={(e) => setMovieSearchQuery(e.target.value)}
                    placeholder="Search shows and movies..."
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full px-5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4081]/50 pl-11 shadow-sm transition-all text-zinc-900 dark:text-zinc-100"
                  />
                  <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                </div>
              </div>

              {isMoviesLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                    <div key={i} className="animate-pulse bg-zinc-200 dark:bg-zinc-800 rounded-2xl aspect-[2/3] w-full"></div>
                  ))}
                </div>
              ) : movies.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                  {movies.map((movie: any) => (
                    <div 
                      key={movie.id} 
                      className="group relative rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-900 shadow-sm ring-1 ring-zinc-200/50 dark:ring-zinc-800/50 hover:shadow-xl transition-all duration-300 cursor-pointer"
                      onClick={() => movie.imdbId && setActiveShowImdbId(movie.imdbId)}
                    >
                      {movie.posterUrl ? (
                        <img 
                          src={movie.posterUrl} 
                          alt={movie.title} 
                          className="w-full aspect-[2/3] object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=500&q=80"; // fallback
                          }}
                        />
                      ) : (
                        <div className="w-full aspect-[2/3] bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
                          <Film className="w-12 h-12 text-zinc-400" />
                        </div>
                      )}
                      
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                        <h3 className="text-white font-bold text-lg leading-tight mb-1">{movie.title}</h3>
                        {movie.releaseDate && <p className="text-zinc-300 text-xs mb-2">{new Date(movie.releaseDate).getFullYear()}</p>}
                        <p className="text-zinc-200 text-sm line-clamp-3 leading-snug">{movie.overview}</p>
                        {movie.voteAverage && (
                          <div className="flex items-center gap-1 mt-3">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            <span className="text-yellow-500 font-semibold text-sm">{movie.voteAverage.toFixed(1)}</span>
                          </div>
                        )}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 scale-75 group-hover:scale-100">
                          <Play className="w-6 h-6 text-white ml-1 fill-white" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center flex flex-col items-center bg-white dark:bg-zinc-900 rounded-2xl shadow-sm ring-1 ring-zinc-200/50 dark:ring-zinc-800/50 p-10">
                  <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-5">
                    <Film className="w-10 h-10 text-zinc-300 dark:text-zinc-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">No movies found</h3>
                  <p className="text-zinc-500 dark:text-zinc-400 max-w-sm leading-relaxed">
                    Try adjusting your search query to find what you're looking for.
                  </p>
                </div>
              )}
            </section>
          ) : activeViewTab === 'Home' ? (
            <>
          {/* Upcoming Matches Section */}
          {matches.upcoming.length > 0 && (
            <section id="upcoming-matches" className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-500" />
                  Upcoming Matches
                </h2>
                <div className="flex items-center gap-2">
                  <button onClick={() => scroll(upcomingMatchesRef, 'left')} className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button onClick={() => scroll(upcomingMatchesRef, 'right')} className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="relative group">
                <div 
                  ref={upcomingMatchesRef}
                  className="flex gap-4 overflow-x-auto pb-4 snap-x hide-scrollbar items-start scroll-smooth"
                >
                {matches.upcoming.filter(matchSearchFilter).map(match => {
                  let groupTable = null;
                  if (matchStandings[match.competition?.id]) {
                    const teamId = match.homeTeam?.id;
                    for (const standing of matchStandings[match.competition?.id]) {
                      if (standing.table) {
                        const found = standing.table.find((row: any) => row.team?.id === teamId);
                        if (found) {
                          groupTable = standing.table;
                          break;
                        }
                      }
                    }
                  }

                  return (
                  <div 
                    key={match.id} 
                    onClick={() => handleExpandMatch(match.id, match.competition?.id)}
                    className="min-w-[280px] sm:min-w-[320px] snap-start bg-white dark:bg-zinc-900 rounded-2xl p-4 shadow-sm ring-1 ring-zinc-200/50 dark:ring-zinc-800/50 flex flex-col gap-3 cursor-pointer hover:shadow-md transition-all"
                  >
                    <div className="flex justify-between items-center text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                      <span className="truncate max-w-[150px]">{match.competition?.name || "FIFA"}</span>
                      <span>{new Date(match.utcDate).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 font-medium text-zinc-900 dark:text-zinc-100">
                            {match.homeTeam?.crest && <img src={match.homeTeam.crest} alt={match.homeTeam.name} className="w-5 h-5 object-contain" />}
                            <span className="truncate max-w-[120px]">{match.status === 'FINISHED' && match.score?.fullTime?.home > match.score?.fullTime?.away && "🏆 "}{match.status === 'FINISHED' && match.score?.fullTime?.home === match.score?.fullTime?.away && match.score?.fullTime?.home !== null && "🤝 "}{match.homeTeam?.shortName || match.homeTeam?.name}</span>
                            <button onClick={(e) => { e.stopPropagation(); toggleFavoriteTeam(e, match.homeTeam); }} className="ml-1 text-zinc-300 hover:text-yellow-500 transition-colors">
                              <Star className={`w-4 h-4 ${isTeamFavorite(match.homeTeam?.id) ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                            </button>
                          </div>
                          {match.scorers?.home?.length > 0 && (
                             <div className="flex flex-col text-[11px] text-zinc-500 dark:text-zinc-400 pl-7">
                               {match.scorers.home.map((scorer: string, i: number) => (
                                 <span key={i} className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-700 flex items-center justify-center text-[6px]">⚽</div> {scorer}</span>
                               ))}
                             </div>
                           )}
                        </div>
                        <span className="inline-block font-bold text-lg text-zinc-900 dark:text-zinc-50">{match.score?.fullTime?.home ?? '-'}</span>
                      </div>
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 font-medium text-zinc-900 dark:text-zinc-100">
                            {match.awayTeam?.crest && <img src={match.awayTeam.crest} alt={match.awayTeam.name} className="w-5 h-5 object-contain" />}
                            <span className="truncate max-w-[120px]">{match.status === 'FINISHED' && match.score?.fullTime?.away > match.score?.fullTime?.home && "🏆 "}{match.status === 'FINISHED' && match.score?.fullTime?.away === match.score?.fullTime?.home && match.score?.fullTime?.home !== null && "🤝 "}{match.awayTeam?.shortName || match.awayTeam?.name}</span>
                            <button onClick={(e) => { e.stopPropagation(); toggleFavoriteTeam(e, match.awayTeam); }} className="ml-1 text-zinc-300 hover:text-yellow-500 transition-colors">
                              <Star className={`w-4 h-4 ${isTeamFavorite(match.awayTeam?.id) ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                            </button>
                          </div>
                          {match.scorers?.away?.length > 0 && (
                             <div className="flex flex-col text-[11px] text-zinc-500 dark:text-zinc-400 pl-7">
                               {match.scorers.away.map((scorer: string, i: number) => (
                                 <span key={i} className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-700 flex items-center justify-center text-[6px]">⚽</div> {scorer}</span>
                               ))}
                             </div>
                           )}
                        </div>
                        <span className="inline-block font-bold text-lg text-zinc-900 dark:text-zinc-50">{match.score?.fullTime?.away ?? '-'}</span>
                      </div>
                    </div>
                  </div>
                )})}
              </div>
              </div>
            </section>
          )}

          {/* Featured Player Section */}
          <section className="max-w-6xl mx-auto mt-6 rounded-3xl overflow-hidden shadow-sm bg-white dark:bg-zinc-900 ring-1 ring-zinc-200/50 dark:ring-zinc-800/50">
            <div className="aspect-video w-full bg-black relative">
              <HlsPlayer url={clientApi.getStreamUrl()} />
            </div>
            <div className="p-6 md:p-8">
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2.5 py-1 rounded-full bg-[#FF4081]/10 dark:bg-[#FF4081]/20 text-[#FF4081] text-xs font-semibold uppercase tracking-wide">
                  {clientApi.getFeaturedVideoInfo().category}
                </span>
                <span className="text-zinc-400 dark:text-zinc-500 text-sm flex items-center gap-1">
                  <span>•</span>
                  Featured
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-2">
                {clientApi.getFeaturedVideoInfo().title}
              </h1>
              <p className="text-zinc-600 dark:text-zinc-400 text-sm sm:text-base max-w-3xl leading-relaxed">
                {clientApi.getFeaturedVideoInfo().description}
              </p>
            </div>
          </section>
            </>
          ) : null}
        </div>
      </main>
      
      {expandedMatchId && (
        <MatchModal 
          match={[...matches.live, ...matches.upcoming, ...matches.recent].find(m => m.id === expandedMatchId)}
          matchDetails={matchDetails[expandedMatchId]}
          onClose={() => setExpandedMatchId(null)}
        />
      )}

      {activeShowImdbId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm" onClick={() => setActiveShowImdbId(null)}>
          <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden relative shadow-2xl ring-1 ring-zinc-200/50 dark:ring-zinc-800/50 p-6 sm:p-8" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setActiveShowImdbId(null)}
              className="absolute top-4 right-4 z-10 w-10 h-10 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full flex items-center justify-center text-zinc-900 dark:text-white transition-colors"
            >
              ✕
            </button>
            
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-6 flex items-center gap-2">
              <Play className="w-6 h-6 text-[#FF4081]" />
              Where to Watch
            </h2>
            
            {isLoadingSources ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#FF4081] mb-4"></div>
                <p className="text-zinc-500 dark:text-zinc-400">Finding streaming options...</p>
              </div>
            ) : activeShowSources.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activeShowSources.map((source: any, idx) => (
                  <a
                    key={idx}
                    href={source.web_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 hover:border-[#FF4081]/50 hover:bg-[#FF4081]/5 transition-all group"
                  >
                    <div>
                      <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-[#FF4081] transition-colors">{source.name}</h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 capitalize mt-1">
                        {source.type} {source.price ? `• $${source.price}` : ''} {source.format ? `• ${source.format}` : ''}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-zinc-400 group-hover:text-[#FF4081] transition-colors" />
                  </a>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Play className="w-8 h-8 text-zinc-400" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">No streaming options found</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
                  We couldn't find any current streaming options for this title. It might not be available in your region.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-md" onClick={() => setActiveChannel(null)}>
          <div className="w-full max-w-5xl bg-black rounded-2xl overflow-hidden relative shadow-2xl ring-1 ring-white/10" onClick={e => e.stopPropagation()}>
            <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent z-10 flex items-center justify-between pointer-events-none">
              <h3 className="text-white font-bold text-lg flex items-center gap-2 drop-shadow-md">
                <Tv className="w-5 h-5 text-[#FF4081]" />
                {activeChannel.name}
              </h3>
            </div>
            <button 
              onClick={() => setActiveChannel(null)}
              className="absolute top-4 right-4 z-20 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors backdrop-blur-md"
            >
              ✕
            </button>
            <div className="w-full aspect-video bg-black flex items-center justify-center">
              {activeChannel.type === "shaka" ? (
                <ShakaPlayer url={activeChannel.url} drm={activeChannel.drm} />
              ) : activeChannel.url.endsWith('.html') ? (
                <iframe 
                  src={activeChannel.url} 
                  className="w-full h-full border-0"
                  allowFullScreen
                  allow="autoplay; encrypted-media"
                  sandbox="allow-scripts allow-same-origin allow-presentation"
                />
              ) : (
                <ReactPlayer
                  src={activeChannel.url}
                  autoPlay
                  playing
                  controls
                  width="100%"
                  height="100%"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode; label: string; active?: boolean, onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
      active 
        ? "bg-[#FF4081]/10 dark:bg-[#FF4081]/20 text-[#FF4081]" 
        : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-100"
    }`}>
      {React.cloneElement(icon as any, { className: "w-5 h-5" })}
      {label}
    </button>
  );
}
