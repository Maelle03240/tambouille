"use client";
import { useState, useSyncExternalStore } from "react";
import { Button, Sheet } from "@/components/ui/primitives";

const KEY = "tambouille:install-hint-dismissed";

/** Safari sur iPhone/iPad, appli pas encore installée, aide pas encore fermée. */
function shouldShow(): boolean {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone;
  let dismissed = false;
  try {
    dismissed = localStorage.getItem(KEY) === "1";
  } catch {}
  return isIOS && !standalone && !dismissed;
}

const noSubscribe = () => () => {};

/**
 * Explique comment « Ajouter à l'écran d'accueil » : nécessaire sur iOS pour
 * un stockage hors ligne fiable.
 */
export function InstallHint() {
  const eligible = useSyncExternalStore(noSubscribe, shouldShow, () => false);
  const [closed, setClosed] = useState(false);

  const close = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
    setClosed(true);
  };

  return (
    <Sheet open={eligible && !closed} onClose={close} title="Installer l'appli">
      <p className="text-[17px] leading-relaxed">
        Pour garder tes recettes <strong>même sans réseau</strong>, ajoute l&apos;appli à ton écran d&apos;accueil :
      </p>
      <ol className="flex list-decimal flex-col gap-2 pl-6 text-[17px] leading-relaxed">
        <li>
          Touche le bouton <strong>Partager</strong> <span aria-hidden>(le carré avec une flèche vers le haut)</span> en bas de Safari.
        </li>
        <li>
          Choisis <strong>« Sur l&apos;écran d&apos;accueil »</strong>.
        </li>
        <li>Ouvre ensuite l&apos;appli depuis sa nouvelle icône.</li>
      </ol>
      <Button variant="primary" size="lg" onClick={close} className="mt-2 mb-2">
        Compris
      </Button>
    </Sheet>
  );
}
