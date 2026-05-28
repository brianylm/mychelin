"use client";

import { useState, useEffect } from "react";

// Simple SVG icons as components
const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const ShareIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
    <polyline points="16,6 12,2 8,6"></polyline>
    <line x1="12" y1="2" x2="12" y2="15"></line>
  </svg>
);

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [hasBeenDismissed, setHasBeenDismissed] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    const standalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://');
    
    setIsStandalone(standalone);

    // Detect iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(ios);

    // Check if user previously dismissed
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed);
      const twentyFourHours = 24 * 60 * 60 * 1000;
      if (Date.now() - dismissedTime < twentyFourHours) {
        setHasBeenDismissed(true);
        return;
      } else {
        // Clear old dismissal
        localStorage.removeItem('pwa-install-dismissed');
      }
    }

    // Listen for beforeinstallprompt (Android Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Show prompt after 30 seconds if not standalone and not dismissed
    const timer = setTimeout(() => {
      if (!standalone && !hasBeenDismissed && (deferredPrompt || ios)) {
        setShowPrompt(true);
      }
    }, 30000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      clearTimeout(timer);
    };
  }, [deferredPrompt, isIOS, hasBeenDismissed]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      // Android Chrome install
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowPrompt(false);
      }
    }
    // For iOS, the instructions are already visible - just dismiss
    handleDismiss();
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setHasBeenDismissed(true);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  // Don't show if already installed, dismissed, or no install capability
  if (isStandalone || hasBeenDismissed || (!deferredPrompt && !isIOS) || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white border border-[#800020]/15 rounded-lg shadow-lg p-4 max-w-sm mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-[#800020]/10 rounded-lg flex items-center justify-center">
              <span className="text-lg">🍽️</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">Add to Home Screen</h3>
              <p className="text-xs text-gray-600">Get the best experience</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 p-1"
            aria-label="Dismiss"
          >
            <XIcon />
          </button>
        </div>

        {/* Content */}
        <p className="text-sm text-gray-700 mb-4">
          Add Mychelin to your home screen for quick access and the best experience.
        </p>

        {/* Install buttons/instructions */}
        <div className="flex space-x-3">
          {deferredPrompt ? (
            // Android Chrome - show install button
            <button
              onClick={handleInstall}
              className="flex-1 bg-[#17131f] text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-[#800020] transition-colors flex items-center justify-center space-x-2"
            >
              <PlusIcon />
              <span>Install</span>
            </button>
          ) : isIOS ? (
            // iOS Safari - show instructions
            <div className="flex-1 bg-gray-50 p-3 rounded-md">
              <div className="flex items-center space-x-2 text-sm text-gray-700">
                <ShareIcon />
                <span>Tap <strong>Share</strong> → <strong>Add to Home Screen</strong></span>
              </div>
            </div>
          ) : null}
          
          <button
            onClick={handleDismiss}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}