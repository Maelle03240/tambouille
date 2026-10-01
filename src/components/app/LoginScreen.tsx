"use client";
import { useState } from "react";
import { BRAND } from "@/config/brand";
import { getRepository } from "@/lib/data";
import { sendPasswordReset } from "@/lib/data/actions";
import { Button, Field, Spinner, TextInput } from "@/components/ui/primitives";

/**
 * Connexion par e-mail + mot de passe (fonctionne dans l'appli installée,
 * contrairement aux liens magiques qui s'ouvrent dans Safari).
 * Les comptes sont créés par invitation de l'admin (pas d'inscription libre).
 * « Mot de passe oublié » envoie un lien vers /bienvenue.
 */
export function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  async function forgot() {
    setError(null);
    if (!email.trim()) return setError("Écris d'abord ton e-mail.");
    try {
      await sendPasswordReset(email);
      setInfo("E-mail envoyé : clique sur le lien pour choisir un nouveau mot de passe.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Envoi impossible");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await getRepository().signIn(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion impossible");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="pt-safe mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-8 px-6">
      <div className="flex flex-col items-center gap-2 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" width={112} height={112} className="rounded-[28px]" />
        <h1 className="font-heading text-[34px] leading-tight">{BRAND.name}</h1>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="E-mail">
          <TextInput type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Mot de passe">
          <TextInput
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        {error && <p className="rounded-field bg-accent-100 px-4 py-3 text-accent-800">{error}</p>}
        {info && <p className="rounded-field bg-leaf-200 px-4 py-3 text-leaf-900">{info}</p>}
        <Button type="submit" variant="primary" size="lg" disabled={busy}>
          {busy ? <Spinner /> : "Se connecter"}
        </Button>
        <button type="button" onClick={forgot} className="h-11 text-sm font-bold text-accent-700">
          Mot de passe oublié ?
        </button>
      </form>
    </main>
  );
}
