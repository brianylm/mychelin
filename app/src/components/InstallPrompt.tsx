"use client";

import { useEffect, useState } from "react";
import { Plus, Share, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

type NavigatorWithStandalone = Navigator & { standalone?: boolean };

const DISMISS_KEY = "pwa-install-dismissed-at";
const SHOWN_KEY = "pwa-install-shown-at";
const SESSION_KEY = "pwa-install-shown-this-session";
const PROMPT_DELAY_MS = 2 * 60 * 1000;
const DISMISS_SNOOZE_MS = 30 * 24 * 60 * 60 * 1000;
const SHOWN_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

function getInstallEnvironment() {
  if (typeof window === "undefined") return { isIOS: false, isStandalone: true };
  const nav = window.navigator as NavigatorWithStandalone;
  return {
    isIOS: /iPad|iPhone|iPod/.test(window.navigator.userAgent),
    isStandalone:
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean(nav.standalone) ||
      document.referrer.includes("android-app://"),
  };
}

function withinWindow(key: string, durationMs: number): boolean {
  if (typeof window === "undefined") return true;
  const value = window.localStorage.getItem(key);
  if (!value) return false;
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp)) {
    window.localStorage.removeItem(key);
    return false;
  }
  if (Date.now() - timestamp < durationMs) return true;
  window.localStorage.removeItem(key);
  return false;
}

export function InstallPrompt() {
  const [environment] = useState(getInstallEnvironment);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [suppressed, setSuppressed] = useState(() =>
    environment.isStandalone ||
    withinWindow(DISMISS_KEY, DISMISS_SNOOZE_MS) ||
    withinWindow(SHOWN_KEY, SHOWN_SNOOZE_MS) ||
    (typeof window !== "undefined" && window.sessionStorage.getItem(SESSION_KEY) === "1")
  );

  useEffect(() => {
    if (environment.isStandalone) return;

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, [environment.isStandalone]);

  useEffect(() => {
    if (suppressed || environment.isStandalone) return;

    const timer = window.setTimeout(() => {
      const canInstall = Boolean(deferredPrompt) || environment.isIOS;
      if (!canInstall) return;
      if (withinWindow(DISMISS_KEY, DISMISS_SNOOZE_MS) || withinWindow(SHOWN_KEY, SHOWN_SNOOZE_MS)) {
        setSuppressed(true);
        return;
      }
      window.localStorage.setItem(SHOWN_KEY, Date.now().toString());
      window.sessionStorage.setItem(SESSION_KEY, "1");
      setShowPrompt(true);
    }, PROMPT_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [deferredPrompt, environment.isIOS, environment.isStandalone, suppressed]);

  const dismiss = () => {
    setShowPrompt(false);
    setSuppressed(true);
    window.localStorage.setItem(DISMISS_KEY, Date.now().toString());
    window.sessionStorage.setItem(SESSION_KEY, "1");
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
      }
    }
    dismiss();
  };

  if (environment.isStandalone || suppressed || (!deferredPrompt && !environment.isIOS) || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="mx-auto max-w-sm rounded-lg border border-[#800020]/15 bg-white p-4 shadow-lg">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#800020]/10 text-sm font-semibold text-[#800020]">
              M
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Add to Home Screen</h3>
              <p className="text-xs text-gray-600">Quick kitchen access</p>
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-50 hover:text-gray-600"
            aria-label="Dismiss install prompt"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-4 text-sm leading-5 text-gray-700">
          Install Mychelin when you want faster access from your phone. You can keep using it in the browser.
        </p>

        <div className="flex gap-3">
          {deferredPrompt ? (
            <button
              type="button"
              onClick={() => void handleInstall()}
              className="flex flex-1 items-center justify-center gap-2 rounded-md bg-[#17131f] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#800020]"
            >
              <Plus className="h-4 w-4" />
              <span>Install</span>
            </button>
          ) : environment.isIOS ? (
            <div className="flex-1 rounded-md bg-gray-50 p-3">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Share className="h-4 w-4" />
                <span>
                  Tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>
                </span>
              </div>
            </div>
          ) : null}

          <button
            type="button"
            onClick={dismiss}
            className="rounded-md px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-800"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}
