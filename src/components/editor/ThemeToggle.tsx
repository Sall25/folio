import { Root } from '@radix-ui/react-toggle';
import { useState } from 'react'
import { applyTheme, type Theme } from './theme'
import { SunIcon, MoonIcon } from '@radix-ui/react-icons';

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
      className="
      inline-flex items-center justify-center
      w-11 h-11
      rounded-full
      bg-background
      text-foreground
     
      transition-all duration-200
      hover:bg-muted
      hover:shadow-md
      focus-visible:outline-none
      focus-visible:ring-2
      focus-visible:ring-ring
      focus-visible:ring-offset-2
  "
    >
      {theme === 'light' ? (
        <SunIcon className="w-5 h-5 transition-transform duration-200 rotate-0 scale-100" />
      ) : (
        <MoonIcon className="w-5 h-5 transition-transform duration-200 rotate-0 scale-100" />
      )}
    </Root>

  );
}
