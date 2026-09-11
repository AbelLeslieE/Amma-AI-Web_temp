'use client';
import { useEffect } from 'react';

// iOS's keyboard can resize the visual viewport without resizing CSS vh/dvh.
// Keep modal controls inside the area the user can actually see, including zoom.
export function useVisibleViewport() {
  useEffect(() => {
    const viewport = window.visualViewport;
    const style = document.documentElement.style;
    const update = () => {
      document.documentElement.toggleAttribute(
        'data-compact-viewport',
        (viewport?.height || window.innerHeight) <= 550,
      );
      style.setProperty(
        '--visible-height',
        `${viewport?.height || window.innerHeight}px`,
      );
      style.setProperty(
        '--visible-width',
        `${viewport?.width || window.innerWidth}px`,
      );
      style.setProperty('--visible-top', `${viewport?.offsetTop || 0}px`);
      style.setProperty('--visible-left', `${viewport?.offsetLeft || 0}px`);
    };
    update();
    viewport?.addEventListener('resize', update);
    viewport?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      viewport?.removeEventListener('resize', update);
      viewport?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      document.documentElement.removeAttribute('data-compact-viewport');
      for (const name of ['height', 'width', 'top', 'left'])
        style.removeProperty(`--visible-${name}`);
    };
  }, []);
}
