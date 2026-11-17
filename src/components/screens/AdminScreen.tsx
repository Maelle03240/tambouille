"use client";
/**
 * ADMIN (Réglages → Admin) : inviter quelqu'un (l'appli donne un lien à lui
 * envoyer soi-même, pas d'e-mail), gérer les foyers et leurs
 * membres, les rôles. Les droits sont vérifiés par la base (RLS) : cet écran
 * n'est qu'un raccourci. Les propositions de recettes sont dans Réglages → Propositions.
 */
import { useEffect, useState } from "react";
import { useApp } from "@/components/app/AppProvider";
import { IconClose, IconPlus, IconTrash } from "@/components/ui/icons";
import { BackLink, Button, Chip, Field, SectionTitle, Spinner, TextInput, cx } from "@/components/ui/primitives";
import { BRAND } from "@/config/brand";
import { ROLE_LABELS } from "@/config/ui";
import { getRepository } from "@/lib/data";
import type { AdminOverview } from "@/lib/data/repository";
import { syncNow } from "@/lib/data/sync";
import { requestAccountAction, requestAccounts, requestInvite, type AccountInfo } from "@/lib/import/client";
import type { Role } from "@/lib/recipes/types";

export function AdminScreen() {
  const { isAdmin, online, features, toast, profile } = useApp();
  const admin = getRepository().admin;
  const [data, setData] = useState<AdminOverview | null>(null);
  const [newHousehold, setNewHousehold] = useState("");
  const [accounts, setAccounts] = useState<AccountInfo[]>([]);
  /** Dernier lien créé, à envoyer à la personne. */
  const [shared, setShared] = useState<{ name: string; link: string } | null>(null);

  // incrémenté après chaque action pour relire
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!online || !admin) return;
    let alive = true;
    admin
      .overview()
      .then((d) => alive && setData(d))
      .catch((e) => toast(e instanceof Error ? e.message : "Lecture impossible"));
    if (features.invites) {
      requestAccounts()
        .then((a) => alive && setAccounts(a))
        .catch((e) => toast(e instanceof Error ? e.message : "Lecture impossible"));
    }
    return () => {
      alive = false;
    };
  }, [online, admin, toast, version, features.invites]);

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

  if (!isAdmin) {
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

        {/* gestion des comptes : Supabase seulement (pas en mode local) */}
        {admin && (
          <>
            <InviteForm
              households={data?.households ?? []}
              enabled={!!features.invites && online}
              onDone={(name, link) => {
                setShared({ name, link });
                void act(async () => {}, "Compte créé : envoie-lui le lien");
              }}
            />
            {shared && <LinkToSend {...shared} onClose={() => setShared(null)} />}

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
                              onClick={() => {
                                // son dernier foyer : plus de menu ni de courses pour cette personne
                                const last = data.households.filter((x) => x.memberIds.includes(id)).length === 1;
                                if (last && !confirm(`${nameOf(id)} n'aura plus aucun foyer, donc ni menu ni courses. La retirer quand même ?`))
                                  return;
                                act(() => admin.removeMember(h.id, id));
                              }}
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
              {data?.people.map((p) => {
                const account = accounts.find((a) => a.id === p.id);
                return (
                  <div key={p.id} className="flex flex-col gap-2 rounded-[26px] bg-surface px-4 py-3">
                    <div className="flex items-start gap-2">
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="font-bold">{p.displayName || "?"}</span>
                        {account && <span className="truncate text-sm text-neutral-700">{account.email}</span>}
                      </span>
                      {account && p.id !== profile?.id && p.role !== "admin" && (
                        <button
                          type="button"
                          aria-label={`Supprimer le compte de ${p.displayName}`}
                          disabled={!online}
                          onClick={() =>
                            confirm(
                              `Supprimer le compte de ${p.displayName} ? C'est définitif. Ce que tu as accepté reste. Ses recettes refusées disparaissent, sauf dans son foyer s'il y a quelqu'un d'autre ; son foyer est supprimé s'il y est seul.`,
                            ) && act(() => requestAccountAction("delete", p.id), "Compte supprimé")
                          }
                          className="flex size-10 flex-none items-center justify-center rounded-full text-neutral-700 disabled:opacity-45"
                        >
                          <IconTrash size={18} />
                        </button>
                      )}
                    </div>
                    {account?.pending && (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-accent-100 px-3 py-1 text-[13px] font-bold text-accent-800">Invitation en attente</span>
                        <button
                          type="button"
                          disabled={!online}
                          onClick={() =>
                            act(async () => {
                              const { link } = await requestAccountAction("resend", p.id);
                              if (link) {
                                setShared({ name: p.displayName || "", link });
                                window.scrollTo({ top: 0, behavior: "smooth" });
                              }
                            }, "Nouveau lien prêt")
                          }
                          className="h-9 rounded-full border-[1.5px] border-divider px-3 text-sm font-bold disabled:opacity-45"
                        >
                          Nouveau lien
                        </button>
                      </div>
                    )}
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
                );
              })}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

/** Le lien d'invitation à envoyer soi-même (Messages, Snap, WhatsApp…). */
function LinkToSend({ name, link, onClose }: { name: string; link: string; onClose: () => void }) {
  const { toast } = useApp();
  const text = `Coucou${name ? ` ${name}` : ""} ! Voilà ton lien pour créer ton mot de passe sur ${BRAND.name} : ${link}`;
  const canShare = typeof navigator !== "undefined" && !!navigator.share;

  async function share() {
    try {
      await navigator.share({ text });
    } catch {
      /* partage annulé */
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      toast("Copié");
    } catch {
      toast("Copie impossible : sélectionne le lien à la main");
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-[26px] bg-accent-100 p-4 text-accent-800">
      <div className="flex items-start gap-2">
        <p className="flex-1 font-bold">Lien pour {name || "cette personne"} — à lui envoyer toi-même</p>
        <button type="button" aria-label="Fermer" onClick={onClose} className="flex size-8 flex-none items-center justify-center rounded-full">
          <IconClose size={15} />
        </button>
      </div>
      <p className="break-all rounded-field bg-surface px-3 py-2 text-sm text-neutral-700 select-all">{link}</p>
      <div className="flex flex-wrap gap-2">
        {canShare && (
          <Button type="button" variant="primary" onClick={share}>
            Partager
          </Button>
        )}
        <Button type="button" onClick={copy}>
          Copier le message
        </Button>
      </div>
      <p className="text-sm">Il ne sert qu&apos;une fois et expire vite : envoie-le maintenant. Expiré ? « Nouveau lien » dans Comptes.</p>
    </section>
  );
}

function InviteForm({
  households,
  enabled,
  onDone,
}: {
  households: AdminOverview["households"];
  enabled: boolean;
  onDone: (name: string, link: string) => void;
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
      const { link } = await requestInvite({ email: email.trim(), name: name.trim(), role, householdId });
      onDone(name.trim(), link);
      setEmail("");
      setName("");
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
          {busy ? <Spinner /> : "Créer le compte et le lien"}
        </Button>
      </form>
    </section>
  );
}
