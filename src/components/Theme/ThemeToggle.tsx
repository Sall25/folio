import { Root } from '@radix-ui/react-toggle';
import { useEffect, useState } from 'react';
import { applyTheme, getTheme, type Theme } from './theme';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => getTheme());

  const isDark = theme === 'dark';

  function handleToggle() {
    const nextTheme = isDark ? 'light' : 'dark';
    setTheme(nextTheme);
    applyTheme(nextTheme);
  }

  useEffect(() => {
    applyTheme(theme);
  }, []);


  return (
    <Root
      pressed={isDark} // controlled state
      onPressedChange={handleToggle} // Radix fires after state changes
      className="toolbar-button"
    >
      {isDark ? <Moon size={16} /> : <Sun size={16} />}
    </Root>
  );
}
