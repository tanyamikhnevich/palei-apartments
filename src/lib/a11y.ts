/**
 * The visitor's own accessibility choices: larger text, stronger contrast,
 * no motion, underlined links.
 *
 * They live in this browser and are applied as `data-a11y-*` attributes on
 * `<html>`, so the whole effect is CSS — see the "Accessibility modes" block
 * in `globals.scss`. Nothing is sent anywhere, and nothing is loaded from
 * anyone else's server to do it.
 */
export type A11ySettings = {
  /** 0 is the site's own size; 1 and 2 are the two steps up. */
  text: 0 | 1 | 2;
  contrast: boolean;
  /** Stops animations, transitions and the slideshows. */
  calm: boolean;
  links: boolean;
};

export const DEFAULT_A11Y: A11ySettings = { text: 0, contrast: false, calm: false, links: false };

const STORAGE_KEY = 'palei-a11y';

/** Fired on `window` when a setting changes, for the scripts that run slideshows. */
export const A11Y_EVENT = 'palei-a11y';

export function readA11y(): A11ySettings {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<A11ySettings>;
    return {
      text: stored.text === 1 || stored.text === 2 ? stored.text : 0,
      contrast: stored.contrast === true,
      calm: stored.calm === true,
      links: stored.links === true,
    };
  } catch {
    // Private mode, or storage switched off: the defaults, and no memory of them.
    return DEFAULT_A11Y;
  }
}

function apply(settings: A11ySettings): void {
  const flags = document.documentElement.dataset;
  const set = (name: string, value: string | false) => {
    if (value === false) delete flags[name];
    else flags[name] = value;
  };
  set('a11yText', settings.text > 0 && String(settings.text));
  set('a11yContrast', settings.contrast && '');
  set('a11yCalm', settings.calm && '');
  set('a11yLinks', settings.links && '');
}

export function saveA11y(settings: A11ySettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Still applied for this page view; it just will not be remembered.
  }
  apply(settings);
  window.dispatchEvent(new Event(A11Y_EVENT));
}

/**
 * Runs before the page is painted, so someone who asked for large text or no
 * motion never sees a frame without it. Written out as a string because it has
 * to execute ahead of the bundle; it mirrors `readA11y` and `apply` above.
 */
export const A11Y_BOOT_SCRIPT = `(function(){try{var s=JSON.parse(localStorage.getItem('${STORAGE_KEY}')||'{}'),d=document.documentElement.dataset;if(s.text===1||s.text===2)d.a11yText=String(s.text);if(s.contrast===true)d.a11yContrast='';if(s.calm===true)d.a11yCalm='';if(s.links===true)d.a11yLinks='';}catch(e){}})();`;
