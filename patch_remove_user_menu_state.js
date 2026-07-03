import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  "  const [showUserMenu, setShowUserMenu] = useState(false);\n",
  ""
);
code = code.replace(
  "  const userMenuRef = useRef<HTMLDivElement>(null);\n",
  ""
);

const useEffectTarget = `  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);`;

code = code.replace(useEffectTarget, "");

fs.writeFileSync('src/App.tsx', code);
