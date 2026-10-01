"use client";
/** Réglages : compte, foyer, synchro, seuils, sauvegarde, accès admin. */
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { useApp } from "@/components/app/AppProvider";
import { OfflineBanner } from "@/components/app/OfflineBanner";
import { TabBar } from "@/components/app/TabBar";
import { Button, Chip, Field, NumberInput, SectionTitle, Spinner, TextInput } from "@/components/ui/primitives";
import { BRAND } from "@/config/brand";
import { exportAll, renameHousehold, saveSettings, switchHousehold } from "@/lib/data/actions";
import { getMeta } from "@/lib/data/db";
import { useHouseholds, useOpenReviewCount, useSettings } from "@/lib/data/hooks";
import { ROLE_LABELS } from "@/config/ui";
import Link from "next/link";

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
  const reviewCount = useOpenReviewCount();
  // undefined = pas modifié : on affiche la valeur enregistrée
  const [thresholdDraft, setThreshold] = useState<number | null | undefined>(undefined);
  const threshold = thresholdDraft === undefined ? settings.proteinRichThresholdG : thresholdDraft;
  const lastSync = useLiveQuery(() => getMeta("lastSyncAt"), []);
  const households = useHouseholds();
  const current = households?.list.find((h) => h.id === households.currentId) ?? null;
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const name = nameDraft ?? current?.name ?? "";

  async function run(fn: () => Promise<unknown>, done?: string) {
    try {
      await fn();
      if (done) app.toast(done);
    } catch (e) {
      app.toast(e instanceof Error ? e.message : "Impossible");
    }
  }

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
        </section>
        {app.mode === "supabase" && (
          <section className="flex flex-col gap-3">
            <SectionTitle>Foyer</SectionTitle>
            {households && households.list.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {households.list.map((h) => (
                  <Chip
                    key={h.id}
                    selected={h.id === households.currentId}
                    onClick={() => h.id !== households.currentId && run(() => switchHousehold(h.id))}
                  >
                    {h.name}
                  </Chip>
                ))}
              </div>
            )}
            {current ? (
              <div className="flex gap-2">
                <TextInput value={name} onChange={(e) => setNameDraft(e.target.value)} aria-label="Nom du foyer" />
                <Button
                  variant="primary"
                  disabled={!app.online || !name.trim() || name === current.name}
                  onClick={() => run(() => renameHousehold(current.id, name), "Foyer renommé").then(() => setNameDraft(null))}
                >
                  OK
                </Button>
              </div>
            ) : (
              <p className="text-neutral-700">Aucun foyer : demande à l&apos;admin de t&apos;en ajouter un.</p>
            )}
          </section>
        )}
        {app.isAdmin && app.mode === "supabase" && (
          <Link href="/admin" className="flex h-14 items-center justify-between rounded-[28px] bg-surface px-5 font-bold">
            Admin <span className="text-accent-700">→</span>
          </Link>
        )}
        <Link href="/a-revoir" className="flex h-14 items-center justify-between rounded-[28px] bg-surface px-5 font-bold">
          À revoir <span className="text-accent-700">{reviewCount}</span>
        </Link>
        <Link href="/ingredients" className="flex h-14 items-center justify-between rounded-[28px] bg-surface px-5 font-bold">
          Mes ingrédients <span className="text-accent-700">→</span>
        </Link>
        {app.syncError && <p className="rounded-field bg-accent-100 px-4 py-3 text-accent-800">{app.syncError}</p>}

        {app.mode === "supabase" && (
          <Button onClick={app.sync} disabled={!app.online || app.syncing}>
            Synchroniser maintenant
          </Button>
        )}

        {app.features.illustrations && (
          <label className="flex min-h-14 items-center justify-between gap-3 rounded-[28px] bg-surface px-5 font-bold">
            Illustrations automatiques
            <input
              type="checkbox"
              checked={settings.autoIllustrations}
              disabled={!app.online}
              onChange={(e) => saveSettings({ ...settings, autoIllustrations: e.target.checked }).catch((err) => app.toast(err.message))}
              className="size-6 accent-[var(--color-accent-600)]"
            />
          </label>
        )}

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
          <Button onClick={download}>Exporter mes recettes en JSON</Button>
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
