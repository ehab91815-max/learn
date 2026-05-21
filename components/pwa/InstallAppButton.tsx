// "use client";

// import { useEffect, useState } from "react";

// type BeforeInstallPromptEvent = Event & {
//   prompt: () => Promise<void>;
//   userChoice: Promise<{
//     outcome: "accepted" | "dismissed";
//     platform: string;
//   }>;
// };

// function isStandaloneMode() {
//   if (typeof window === "undefined") return false;

//   const isDisplayStandalone = window.matchMedia(
//     "(display-mode: standalone)"
//   ).matches;

//   const isIosStandalone =
//     "standalone" in window.navigator &&
//     (window.navigator as Navigator & { standalone?: boolean }).standalone ===
//       true;

//   return isDisplayStandalone || isIosStandalone;
// }

// export default function InstallAppButton() {
//   const [installPrompt, setInstallPrompt] =
//     useState<BeforeInstallPromptEvent | null>(null);

//   const [isInstalled, setIsInstalled] = useState(false);

//   useEffect(() => {
//     if (typeof window === "undefined") return;

//     if (isStandaloneMode()) {
//       setIsInstalled(true);
//       return;
//     }

//     const handleBeforeInstallPrompt = (event: Event) => {
//       event.preventDefault();
//       setInstallPrompt(event as BeforeInstallPromptEvent);
//     };

//     const handleAppInstalled = () => {
//       setInstallPrompt(null);
//       setIsInstalled(true);
//       window.localStorage.setItem("rawdat-alhuda-pwa-installed", "true");
//     };

//     const wasInstalledBefore =
//       window.localStorage.getItem("rawdat-alhuda-pwa-installed") === "true";

//     if (wasInstalledBefore || isStandaloneMode()) {
//       setIsInstalled(true);
//       return;
//     }

//     window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
//     window.addEventListener("appinstalled", handleAppInstalled);

//     return () => {
//       window.removeEventListener(
//         "beforeinstallprompt",
//         handleBeforeInstallPrompt
//       );
//       window.removeEventListener("appinstalled", handleAppInstalled);
//     };
//   }, []);

//   const handleInstall = async () => {
//     if (!installPrompt) return;

//     await installPrompt.prompt();

//     const choice = await installPrompt.userChoice;

//     if (choice.outcome === "accepted") {
//       setIsInstalled(true);
//       window.localStorage.setItem("rawdat-alhuda-pwa-installed", "true");
//     }

//     setInstallPrompt(null);
//   };

//   if (isInstalled || !installPrompt) return null;

//   return (
//     <div className="rounded-2xl border bg-card p-4 text-card-foreground shadow-sm">
//       <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
//         <div>
//           <h2 className="text-base font-bold">ثبّت التطبيق على جهازك</h2>
//           <p className="mt-1 text-sm text-muted-foreground">
//             افتح منصة روض الهدى كتطبيق مستقل للوصول السريع من الشاشة الرئيسية.
//           </p>
//         </div>

//         <button
//           type="button"
//           onClick={handleInstall}
//           className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
//         >
//           تثبيت التطبيق
//         </button>
//       </div>
//     </div>
//   );
// }


"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

function isAppAlreadyInstalled() {
  if (typeof window === "undefined") return false;

  const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
  const isIosStandalone = (
    window.navigator as Navigator & { standalone?: boolean }
  ).standalone;

  return isStandalone || Boolean(isIosStandalone);
}

export default function PwaInstallButton() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isAppAlreadyInstalled()) {
      setVisible(false);
      return;
    }

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();

      setInstallPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    }

    function handleAppInstalled() {
      setInstallPrompt(null);
      setVisible(false);
      setDismissed(false);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!installPrompt) return;

    setInstalling(true);

    try {
      await installPrompt.prompt();

      const choice = await installPrompt.userChoice;

      if (choice.outcome === "accepted") {
        setVisible(false);
        setInstallPrompt(null);
      }
    } finally {
      setInstalling(false);
    }
  }

  if (!visible || dismissed || !installPrompt) return null;

  return (
    <div className="fixed inset-x-3 bottom-20 z-50 mx-auto max-w-md lg:bottom-5 lg:left-5 lg:right-auto">
      <div className="rounded-2xl border bg-card/95 p-3 shadow-lg backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
            <Download className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold">ثبّت التطبيق</div>
            <div className="text-xs text-muted-foreground">
              افتح المنصة كتطبيق مستقل من الشاشة الرئيسية.
            </div>
          </div>

          <Button size="sm" onClick={handleInstall} disabled={installing}>
            {installing ? "..." : "تثبيت"}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            aria-label="إخفاء زر التثبيت"
            onClick={() => setDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}