// Comfort view: larger text and buttons, higher contrast, fewer extras —
// for older cooks or anyone who wants a calmer screen. Stored per device
// (the person using this phone), applied as <html data-comfort="on">.
export const COMFORT_STORAGE_KEY = "mychelin.comfort";

export function readComfortMode(): boolean {
  try {
    return localStorage.getItem(COMFORT_STORAGE_KEY) === "on";
  } catch {
    return false;
  }
}

export function setComfortMode(on: boolean): void {
  try {
    if (on) localStorage.setItem(COMFORT_STORAGE_KEY, "on");
    else localStorage.removeItem(COMFORT_STORAGE_KEY);
  } catch {
    // Storage blocked: the setting still applies until the page reloads.
  }
  if (on) document.documentElement.dataset.comfort = "on";
  else delete document.documentElement.dataset.comfort;
}

// Runs before first paint (inline in <head>) so the page never flashes at
// the normal size first. Kept tiny and dependency-free on purpose.
export const COMFORT_BOOT_SCRIPT = `try{if(localStorage.getItem(${JSON.stringify(
  COMFORT_STORAGE_KEY
)})==="on")document.documentElement.dataset.comfort="on"}catch(e){}`;
