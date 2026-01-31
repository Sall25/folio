import { Root } from '@radix-ui/react-toggle';
import { useState } from 'react';
import { applyTheme, type Theme } from './theme';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light');

  const isDark = theme === 'dark';

  function handleToggle() {
    const nextTheme = isDark ? 'light' : 'dark';
    setTheme(nextTheme);
    applyTheme(nextTheme);
  }

  return (
    <Root
      pressed={isDark} // controlled state
      onPressedChange={handleToggle} // Radix fires after state changes
      className="toolbar-button"
    >
      {isDark ? <Moon className="icon" /> : <Sun className="icon" />}
    </Root>
  );
}
