import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace("            </>\n          )}\n        </div>", "            </>\n          ) : null}\n        </div>");
fs.writeFileSync('src/App.tsx', code);
