"use client";
/**
 * ADMIN (Réglages → Admin) : inviter quelqu'un, gérer les foyers et leurs
 * membres, les rôles. Les droits sont vérifiés par la base (RLS) : cet écran
 * n'est qu'un raccourci. Étape 2 : les propositions de recettes s'ajouteront ici.
 */
import { useEffect, useState } from "react";
import { useApp } from "@/components/app/AppProvider";
import { IconClose, IconPlus, IconTrash } from "@/components/ui/icons";
import { BackLink, Button, Chip, Field, SectionTitle, Spinner, TextInput, cx } from "@/components/ui/primitives";
import { ROLE_LABELS } from "@/config/ui";
import { getRepository } from "@/lib/data";
import type { AdminOverview } from "@/lib/data/repository";
import { syncNow } from "@/lib/data/sync";
import { requestInvite } from "@/lib/import/client";
import type { Role } from "@/lib/recipes/types";

export function AdminScreen() {
  const { isAdmin, online, features, toast, profile } = useApp();
  const admin = getRepository().admin;
  const [data, setData] = useState<AdminOverview | null>(null);
  const [newHousehold, setNewHousehold] = useState("");

  // incrémenté après chaque action pour relire
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!online || !admin) return;
    let alive = true;
    admin
      .overview()
      .then((d) => alive && setData(d))
      .catch((e) => toast(e instanceof Error ? e.message : "Lecture impossible"));
    return () => {
      alive = false;
    };
  }, [online, admin, toast, version]);

  /** Une action admin, puis on relit (et on resynchronise : mes foyers ont pu changer). */
  async function act(fn: () => Promise<unknown>, done?: string) {
    try {
      await fn();
      if (done) toast(done);
      setVersion((v) => v + 1);
      void syncNow();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Impossible");
    }
  }

  if (!isAdmin || !admin) {
    return (
      <main className="pt-safe mx-auto max-w-2xl px-4">
        <BackLink href="/reglages" />
        <p className="py-10 text-center text-neutral-700">Réservé à l&apos;admin.</p>
      </main>
    );
  }

  const nameOf = (id: string) => data?.people.find((p) => p.id === id)?.displayName || "?";

  return (
    <div className="pb-16">
      <header className="pt-safe mx-auto flex max-w-2xl items-center gap-3 px-4 pb-2">
        <BackLink href="/reglages" />
        <h1 className="font-heading text-[30px] leading-tight">Admin</h1>
      </header>

      <main className="mx-auto flex max-w-2xl flex-col gap-7 px-4">
        {!online && <p className="rounded-field bg-accent-100 px-4 py-3 text-accent-800">Pas de réseau.</p>}

        <InviteForm households={data?.households ?? []} enabled={!!features.invites && online} onDone={() => act(async () => {}, "Invitation envoyée")} />

        <section className="flex flex-col gap-3">
          <SectionTitle>Foyers</SectionTitle>
          {!data ? (
            <Spinner />
          ) : (
            data.households.map((h) => {
              const others = data.people.filter((p) => !h.memberIds.includes(p.id));
              return (
                <div key={h.id} className="flex flex-col gap-2.5 rounded-[26px] bg-surface p-4">
                  <div className="flex items-center gap-2">
                    <span className="flex-1 font-heading text-[20px]">{h.name}</span>
                    <button
                      type="button"
                      aria-label={`Supprimer ${h.name}`}
                      disabled={!online}
                      onClick={() =>
                        confirm(`Supprimer « ${h.name} » avec son menu, ses modèles et sa liste de courses ?`) &&
                        act(() => admin.deleteHousehold(h.id), "Foyer supprimé")
                      }
                      className="flex size-10 items-center justify-center rounded-full text-neutral-700 disabled:opacity-45"
                    >
                      <IconTrash size={18} />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {h.memberIds.map((id) => (
                      <span key={id} className="flex h-10 items-center gap-1 rounded-full bg-neutral-100 pr-1 pl-4 font-bold">
                        {nameOf(id)}
                        <button
                          type="button"
                          aria-label={`Retirer ${nameOf(id)}`}
                          disabled={!online}
                          onClick={() => act(() => admin.removeMember(h.id, id))}
                          className="flex size-8 items-center justify-center rounded-full text-neutral-700"
                        >
                          <IconClose size={15} />
                        </button>
                      </span>
                    ))}
                    {others.length > 0 && (
                      <select
                        value=""
                        disabled={!online}
                        aria-label="Ajouter un membre"
                        onChange={(e) => e.target.value && act(() => admin.addMember(h.id, e.target.value))}
                        className="h-10 rounded-full border-[1.5px] border-dashed border-divider bg-transparent px-3 font-bold text-neutral-700"
                      >
                        <option value="">+ Ajouter</option>
                        {others.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.displayName}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              act(() => admin.createHousehold(newHousehold.trim()), "Foyer créé").then(() => setNewHousehold(""));
            }}
          >
            <TextInput value={newHousehold} onChange={(e) => setNewHousehold(e.target.value)} placeholder="Nouveau foyer, ex. Chez Maman" />
            <button
              type="submit"
              aria-label="Créer le foyer"
              disabled={!online || !newHousehold.trim()}
              className="flex size-12 flex-none items-center justify-center rounded-full bg-accent-600 text-neutral-100 disabled:opacity-45"
            >
              <IconPlus size={20} />
            </button>
          </form>
        </section>

        <section className="flex flex-col gap-3">
          <SectionTitle>Comptes</SectionTitle>
          {data?.people.map((p) => (
            <div key={p.id} className="flex flex-col gap-2 rounded-[26px] bg-surface px-4 py-3">
              <span className="font-bold">{p.displayName || "?"}</span>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                  <Chip
                    key={r}
                    selected={p.role === r}
                    // on ne se retire pas soi-même le rôle admin
                    disabled={!online || p.id === profile?.id}
                    onClick={() => p.role !== r && act(() => admin.setRole(p.id, r))}
                  >
                    {ROLE_LABELS[r]}
                  </Chip>
                ))}
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

function InviteForm({
  households,
  enabled,
  onDone,
}: {
  households: AdminOverview["households"];
  enabled: boolean;
  onDone: () => void;
}) {
  const { toast, features } = useApp();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"editor" | "reader">("editor");
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await requestInvite({ email: email.trim(), name: name.trim(), role, householdId });
      setEmail("");
      setName("");
      onDone();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Invitation impossible");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <SectionTitle>Inviter</SectionTitle>
      {!features.invites && (
        <p className="rounded-field bg-accent-100 px-4 py-3 text-accent-800">Clé SUPABASE_SERVICE_ROLE_KEY manquante dans Vercel.</p>
      )}
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field label="Prénom">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} />
        </Field>
        <Field label="E-mail">
          <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="off" />
        </Field>
        <div className="flex flex-wrap gap-1.5">
          {(["editor", "reader"] as const).map((r) => (
            <Chip key={r} selected={role === r} onClick={() => setRole(r)}>
              {ROLE_LABELS[r]}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip selected={householdId === null} onClick={() => setHouseholdId(null)}>
            Son propre foyer
          </Chip>
          {households.map((h) => (
            <Chip key={h.id} selected={householdId === h.id} onClick={() => setHouseholdId(h.id)}>
              {h.name}
            </Chip>
          ))}
        </div>
        <Button type="submit" variant="primary" disabled={!enabled || busy} className={cx(busy && "opacity-70")}>
          {busy ? <Spinner /> : "Envoyer l'invitation"}
        </Button>
      </form>
    </section>
  );
}
