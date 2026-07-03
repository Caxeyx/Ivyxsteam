import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `<div className="relative" ref={userMenuRef}>
              <div 
                className="w-8 h-8 rounded-full bg-[#FF4081]/10 dark:bg-[#FF4081]/20 text-[#FF4081] flex items-center justify-center font-bold text-sm cursor-pointer hover:bg-[#FF4081]/20 dark:hover:bg-[#FF4081]/30 transition-colors"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                U
              </div>
                  
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-800 py-1 z-50 overflow-hidden">
                  <div className="px-4 py-2 text-sm text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors">
                    My Account
                  </div>
                  <div className="px-4 py-2 text-sm text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors">
                    Subscription
                  </div>
                  <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-1" />
                  <div className="px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer transition-colors">
                    Logout
                  </div>
                </div>
              )}
            </div>`;

code = code.replace(target, "");
fs.writeFileSync('src/App.tsx', code);
