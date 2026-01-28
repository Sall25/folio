import { Root } from '@radix-ui/react-toggle';
import { useState } from 'react'
import { applyTheme, type Theme } from './theme'
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light')


  function onToggle() {
    const toggle = document.getElementById('toggle-root') as HTMLElement;
    const state = toggle.dataset.state;
    if (state === 'on') {
      setTheme('dark');
      applyTheme('dark');
    } else {
      setTheme('light');
      applyTheme('light');
    }

  }

  return (
    <Root
      onClick={onToggle}
      id='toggle-root'
      className="toolbar-button"
    >
      {theme === 'light' ? (
        <Sun className="icon" />
      ) : (
        <Moon className='icon' />
      )}
    </Root>

  );
}
