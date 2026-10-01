"use client";
/**
 * BIENVENUE : on arrive ici depuis l'e-mail d'invitation (ou « mot de passe
 * oublié »), déjà connecté·e par le lien : on choisit son mot de passe, une
 * fois. Ensuite on se connecte avec, sur chaque appareil.
 */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/components/app/AppProvider";
import { Button, Field, Spinner, TextInput } from "@/components/ui/primitives";
import { BRAND } from "@/config/brand";
import { setPassword } from "@/lib/data/actions";

export function WelcomeScreen() {
  const router = useRouter();
  const { profile, toast } = useApp();
  const [password, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await setPassword(password);
      toast("Mot de passe enregistré");
      router.replace("/");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Impossible");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="pt-safe mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-8 px-6">
      <div className="flex flex-col items-center gap-2 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" width={96} height={96} className="rounded-[24px]" />
        <h1 className="font-heading text-[32px] leading-tight">
          Bienvenue{profile?.displayName ? ` ${profile.displayName}` : ""} !
        </h1>
        <p className="text-neutral-700">{BRAND.name}</p>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Choisis ton mot de passe" hint="8 caractères minimum">
          <TextInput type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPw(e.target.value)} />
        </Field>
        <Button type="submit" variant="primary" size="lg" disabled={busy || password.length < 8}>
          {busy ? <Spinner /> : "C'est parti"}
        </Button>
      </form>
    </main>
  );
}
