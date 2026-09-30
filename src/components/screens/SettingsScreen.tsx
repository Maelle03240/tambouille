"use client";
/** Réglages : compte, synchro, seuils, sauvegarde. */
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { useApp } from "@/components/app/AppProvider";
import { OfflineBanner } from "@/components/app/OfflineBanner";
import { TabBar } from "@/components/app/TabBar";
import { testAlarm } from "@/components/cook/alarm";
import { Button, Field, NumberInput, SectionTitle, Spinner } from "@/components/ui/primitives";
import { BRAND } from "@/config/brand";
import { exportAll, saveSettings } from "@/lib/data/actions";
import { getMeta } from "@/lib/data/db";
import { useSettings } from "@/lib/data/hooks";

const ROLE_LABELS = { admin: "Administratrice", editor: "Peut modifier", reader: "Lecture seule" };

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-divider py-3 last:border-0">
      <span className="text-neutral-700">{label}</span>
      <span className="text-right font-bold">{value}</span>
    </div>
  );
}

export function SettingsScreen() {
  const app = useApp();
  const settings = useSettings();
  // undefined = pas modifié : on affiche la valeur enregistrée
  const [thresholdDraft, setThreshold] = useState<number | null | undefined>(undefined);
  const threshold = thresholdDraft === undefined ? settings.proteinRichThresholdG : thresholdDraft;
  const lastSync = useLiveQuery(() => getMeta("lastSyncAt"), []);

  async function saveThreshold() {
    if (threshold == null) return;
    try {
      await saveSettings({ ...settings, proteinRichThresholdG: threshold });
      setThreshold(undefined);
      app.toast("Réglage enregistré");
    } catch (e) {
      app.toast(e instanceof Error ? e.message : "Enregistrement impossible");
    }
  }

  async function download() {
    const blob = new Blob([await exportAll()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tambouille-recettes-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="pb-32">
      <header className="pt-safe mx-auto max-w-2xl px-5">
        <OfflineBanner className="mb-2" />
        <h1 className="pt-3 pb-4 font-heading text-[36px] leading-[1.1]">Réglages</h1>
      </header>
      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-5">
        <section className="rounded-[28px] bg-surface px-4 py-1">
          {app.mode === "local" ? (
            <Row label="Mode" value="Local (données sur cet appareil)" />
          ) : (
            <>
              <Row label="Compte" value={app.session?.email ?? "—"} />
              <Row label="Rôle" value={app.profile ? ROLE_LABELS[app.profile.role] : "—"} />
            </>
          )}
          <Row
            label="Dernière synchro"
            value={
              app.syncing ? <Spinner /> : lastSync ? new Date(lastSync).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—"
            }
          />
          <Row label="Lecture IA" value={app.features.ai ? "Activée" : "Non configurée"} />
          <Row label="Illustrations IA" value={app.features.illustrations ? "Disponibles (V2)" : "Non configurées"} />
        </section>
        {app.syncError && <p className="rounded-field bg-accent-100 px-4 py-3 text-accent-800">{app.syncError}</p>}

        {app.mode === "supabase" && (
          <Button onClick={app.sync} disabled={!app.online || app.syncing}>
            Synchroniser maintenant
          </Button>
        )}

        <section className="flex flex-col gap-3">
          <SectionTitle>Alarme des minuteurs</SectionTitle>
          <p className="text-[15px] text-neutral-700">
            Sur iPhone, le son suit le <strong>volume média</strong> (boutons sur le côté, appli ouverte). L&apos;appli doit
            rester ouverte à l&apos;écran pendant le minuteur : le mode cuisine garde l&apos;écran allumé pour ça.
          </p>
          <Button onClick={testAlarm}>Tester l&apos;alarme (3 s)</Button>
        </section>

        <section className="flex flex-col gap-3">
          <SectionTitle>Tags automatiques</SectionTitle>
          <Field label="« Riche en protéines » à partir de (g par portion)">
            <div className="flex gap-2">
              <NumberInput value={threshold} onChange={setThreshold} className="flex-1" />
              <Button variant="primary" onClick={saveThreshold} disabled={!app.online || threshold === settings.proteinRichThresholdG}>
                OK
              </Button>
            </div>
          </Field>
        </section>

        <section className="flex flex-col gap-3">
          <SectionTitle>Sauvegarde</SectionTitle>
          <p className="text-[15px] text-neutral-700">Télécharge toutes tes recettes dans un fichier (JSON), au cas où.</p>
          <Button onClick={download}>Exporter mes recettes</Button>
        </section>

        {app.mode === "supabase" && (
          <Button variant="ghost" onClick={app.signOut}>
            Se déconnecter
          </Button>
        )}
        <p className="pb-4 text-center text-xs text-neutral-600">
          {BRAND.name} · {BRAND.tagline}
        </p>
      </main>
      <TabBar />
    </div>
  );
}
