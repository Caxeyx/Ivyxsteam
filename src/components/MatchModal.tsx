import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MapPin, Users, Calendar, Trophy, ChevronRight, Activity, TrendingUp } from 'lucide-react';

interface MatchModalProps {
  match: any;
  matchDetails: any;
  onClose: () => void;
}

export function MatchModal({ match, matchDetails, onClose }: MatchModalProps) {
  const [activeTab, setActiveTab] = React.useState<'about' | 'insights'>('about');

  if (!match) return null;



  const mockInsights = [
    { label: 'Expected Goals (xG)', home: '1.24', away: '0.85', max: 3 },
    { label: 'Ball Possession', home: '58%', away: '42%', isPercent: true },
    { label: 'Total Shots', home: '14', away: '9', max: 20 },
    { label: 'Shots on Target', home: '5', away: '2', max: 10 },
    { label: 'Pass Accuracy', home: '88%', away: '76%', isPercent: true }
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <motion.div
          layoutId={`match-card-${match.id}`}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-3xl max-h-[90vh] bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden ring-1 ring-zinc-200 dark:ring-zinc-800"
        >
          {/* Header */}
          <div className="bg-zinc-50 dark:bg-zinc-950 p-6 flex flex-col items-center border-b border-zinc-200 dark:border-zinc-800 relative">
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-4 bg-zinc-200 dark:bg-zinc-800 px-3 py-1 rounded-full">
              {match.competition?.name || 'Match Details'}
            </div>

            <div className="flex items-center justify-center w-full gap-8">
              <div className="flex flex-col items-center flex-1">
                {match.homeTeam?.crest ? (
                  <img src={match.homeTeam.crest} alt={match.homeTeam.name} className="w-16 h-16 sm:w-20 sm:h-20 object-contain mb-3 drop-shadow-md" />
                ) : (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-zinc-200 dark:bg-zinc-800 rounded-full mb-3" />
                )}
                <span className="font-bold text-center text-zinc-900 dark:text-zinc-100 sm:text-lg leading-tight">{match.status === 'FINISHED' && match.score?.fullTime?.home > match.score?.fullTime?.away && "🏆 "}{match.status === 'FINISHED' && match.score?.fullTime?.home === match.score?.fullTime?.away && match.score?.fullTime?.home !== null && "🤝 "}{match.homeTeam?.name}</span>
              </div>

              <div className="flex flex-col items-center justify-center px-4">
                {match.status === 'IN_PLAY' || match.status === 'FINISHED' || match.status === 'PAUSED' ? (
                  <>
                    <div className="text-4xl font-black text-zinc-900 dark:text-zinc-50 tracking-tighter tabular-nums flex gap-3">
                      <span>{match.score?.fullTime?.home ?? '-'}</span>
                      <span className="text-zinc-300 dark:text-zinc-700">-</span>
                      <span>{match.score?.fullTime?.away ?? '-'}</span>
                    </div>
                    {match.status === 'IN_PLAY' && (
                      <span className="text-[#FF4081] font-bold text-sm mt-2 animate-pulse bg-[#FF4081]/10 px-2 py-0.5 rounded-full">
                        LIVE {matchDetails?.minute ? `${matchDetails.minute}'` : ''}
                      </span>
                    )}
                    {match.status === 'FINISHED' && (
                      <span className="text-zinc-500 font-medium text-sm mt-2">FT</span>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center">
                    <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 px-4 py-2 rounded-xl mb-1">
                      {new Date(match.utcDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-sm font-medium text-zinc-500">
                      {new Date(match.utcDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-col items-center flex-1">
                {match.awayTeam?.crest ? (
                  <img src={match.awayTeam.crest} alt={match.awayTeam.name} className="w-16 h-16 sm:w-20 sm:h-20 object-contain mb-3 drop-shadow-md" />
                ) : (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-zinc-200 dark:bg-zinc-800 rounded-full mb-3" />
                )}
                <span className="font-bold text-center text-zinc-900 dark:text-zinc-100 sm:text-lg leading-tight">{match.status === 'FINISHED' && match.score?.fullTime?.away > match.score?.fullTime?.home && "🏆 "}{match.status === 'FINISHED' && match.score?.fullTime?.away === match.score?.fullTime?.home && match.score?.fullTime?.home !== null && "🤝 "}{match.awayTeam?.name}</span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-zinc-200 dark:border-zinc-800 px-2 sm:px-6 overflow-x-auto hide-scrollbar">
            {['about', 'insights'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-4 py-4 font-medium text-sm whitespace-nowrap border-b-2 transition-colors relative ${
                  activeTab === tab 
                    ? 'border-[#FF4081] text-zinc-900 dark:text-zinc-50' 
                    : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-white dark:bg-zinc-900">
            {activeTab === 'about' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl flex items-start gap-3 border border-zinc-100 dark:border-zinc-800">
                    <Trophy className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs text-zinc-500 font-medium mb-1">Competition</div>
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100">{match.competition?.name}</div>
                      <div className="text-sm text-zinc-600 dark:text-zinc-400">{match.stage || matchDetails?.stage}</div>
                    </div>
                  </div>
                  
                  <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl flex items-start gap-3 border border-zinc-100 dark:border-zinc-800">
                    <Calendar className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs text-zinc-500 font-medium mb-1">Date & Time</div>
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {new Date(match.utcDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </div>
                      <div className="text-sm text-zinc-600 dark:text-zinc-400">
                        {new Date(match.utcDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}
                      </div>
                    </div>
                  </div>

                  <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl flex items-start gap-3 border border-zinc-100 dark:border-zinc-800">
                    <MapPin className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs text-zinc-500 font-medium mb-1">Venue</div>
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {matchDetails?.venue || 'TBD'}
                      </div>
                    </div>
                  </div>

                  <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl flex items-start gap-3 border border-zinc-100 dark:border-zinc-800">
                    <Users className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs text-zinc-500 font-medium mb-1">Referee</div>
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {match.referees?.length > 0 ? match.referees[0].name : (matchDetails?.referees?.length > 0 ? matchDetails.referees[0].name : 'TBD')}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5" /> Match Status
                  </h3>
                  <div className="bg-zinc-50 dark:bg-zinc-950 p-5 rounded-xl border border-zinc-100 dark:border-zinc-800">
                     <div className="flex items-center justify-between mb-2">
                       <span className="font-medium text-zinc-700 dark:text-zinc-300">Status</span>
                       <span className="font-bold">{match.status.replace(/_/g, ' ')}</span>
                     </div>
                     {matchDetails?.score?.halfTime && matchDetails.score.halfTime.home !== null && (
                        <div className="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-zinc-800">
                          <span className="font-medium text-zinc-700 dark:text-zinc-300">Half Time</span>
                          <span className="font-bold">{matchDetails.score.halfTime.home} - {matchDetails.score.halfTime.away}</span>
                        </div>
                     )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'insights' && (
              <div className="space-y-6 max-w-2xl mx-auto">
                <h3 className="text-xl font-bold mb-6 text-center flex items-center justify-center gap-2">
                  <TrendingUp className="w-6 h-6 text-indigo-500" />
                  Match Statistics
                </h3>
                
                <div className="flex justify-between items-center mb-6 px-4">
                  <div className="flex flex-col items-center">
                    {match.homeTeam?.crest && <img src={match.homeTeam.crest} alt="" className="w-8 h-8 object-contain mb-1" />}
                    <span className="font-bold text-sm text-center">{match.homeTeam?.shortName}</span>
                  </div>
                  <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest">VS</div>
                  <div className="flex flex-col items-center">
                    {match.awayTeam?.crest && <img src={match.awayTeam.crest} alt="" className="w-8 h-8 object-contain mb-1" />}
                    <span className="font-bold text-sm text-center">{match.awayTeam?.shortName}</span>
                  </div>
                </div>

                <div className="space-y-5">
                  {mockInsights.map((stat, idx) => {
                    // For percentage bars
                    const homeVal = stat.isPercent ? parseInt(stat.home) : parseFloat(stat.home);
                    const awayVal = stat.isPercent ? parseInt(stat.away) : parseFloat(stat.away);
                    const total = stat.isPercent ? 100 : (stat.max || (homeVal + awayVal));
                    
                    const homePercent = stat.isPercent ? homeVal : (homeVal / total) * 100;
                    const awayPercent = stat.isPercent ? awayVal : (awayVal / total) * 100;

                    return (
                      <div key={idx} className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                        <div className="flex justify-between text-sm font-bold mb-2">
                          <span className={homeVal > awayVal ? 'text-blue-600 dark:text-blue-400' : ''}>{stat.home}</span>
                          <span className="text-zinc-500 dark:text-zinc-400 text-xs uppercase tracking-wider">{stat.label}</span>
                          <span className={awayVal > homeVal ? 'text-rose-600 dark:text-rose-400' : ''}>{stat.away}</span>
                        </div>
                        <div className="flex gap-1 h-2 w-full rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800">
                          <div 
                            className="bg-blue-500 h-full rounded-full transition-all duration-1000 ease-out" 
                            style={{ width: `${homePercent}%` }}
                          />
                          <div className="flex-1 bg-transparent" />
                          <div 
                            className="bg-rose-500 h-full rounded-full transition-all duration-1000 ease-out" 
                            style={{ width: `${awayPercent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="text-center text-sm text-zinc-500 italic mt-6">
                  *Insights are representative as official real-time metrics may be unavailable.
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
