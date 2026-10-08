"use client";
/**
 * Briques d'interface réutilisées partout. Pour changer l'apparence de tous
 * les boutons / champs d'un coup, c'est ici (et les couleurs dans theme.css).
 */
import Link from "next/link";
import { useEffect, useState, type ButtonHTMLAttributes, type ComponentProps, type InputHTMLAttributes, type ReactNode } from "react";
import { IconBack, IconClose } from "./icons";

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

/* ───────────── Boutons ───────────── */

type Variant = "primary" | "secondary" | "ghost" | "dark";
const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent-600 text-neutral-100 shadow-md active:bg-accent-700 font-heading",
  secondary: "bg-surface text-ink active:bg-neutral-300 font-bold",
  ghost: "text-accent-700 active:bg-accent-100 font-bold",
  dark: "bg-neutral-900 text-neutral-100 active:bg-neutral-800 font-bold",
};
const SIZES = { md: "h-12 px-5 text-base", lg: "h-16 px-6 text-xl" };

export function Button({
  variant = "secondary",
  size = "md",
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: keyof typeof SIZES }) {
  return (
    <button
      {...rest}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-full transition-colors disabled:opacity-45",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
    />
  );
}

/** Bouton rond (retour, fermer…) 48 px : taille confortable avec les doigts mouillés. */
export function RoundButton({ className, label, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      {...rest}
      className={cx("flex size-12 flex-none items-center justify-center rounded-full bg-surface active:bg-neutral-300", className)}
    />
  );
}

export function BackLink({ href, className }: { href: string; className?: string }) {
  return (
    <Link
      href={href}
      aria-label="Retour"
      className={cx("flex size-12 flex-none items-center justify-center rounded-full bg-surface active:bg-neutral-300", className)}
    >
      <IconBack />
    </Link>
  );
}

/* ───────────── Pastilles (filtres, choix) ───────────── */

export function Chip({
  selected,
  className,
  style,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      {...rest}
      style={style}
      className={cx(
        "h-11 flex-none whitespace-nowrap rounded-full border-[1.5px] px-4 text-[15px] font-bold transition-colors",
        selected ? "border-ink bg-ink text-bg" : "border-divider bg-neutral-100 text-ink",
        className,
      )}
    />
  );
}

/* ───────────── Champs ───────────── */

export function Field({ label, hint, children, className }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cx("flex flex-col gap-1.5", className)}>
      <span className="text-[13px] font-bold text-neutral-700">{label}</span>
      {children}
      {hint && <span className="text-[13px] text-neutral-700">{hint}</span>}
    </label>
  );
}

const inputBase =
  "w-full rounded-field border-[1.5px] border-divider bg-neutral-100 px-4 text-[17px] text-ink caret-accent placeholder:text-neutral-500 focus:border-accent focus:outline-none";

export function TextInput({ className, ...rest }: ComponentProps<"input">) {
  return <input {...rest} className={cx(inputBase, "min-h-12", className)} />;
}

export function TextArea({ className, ...rest }: ComponentProps<"textarea">) {
  return <textarea {...rest} className={cx(inputBase, "min-h-28 py-3 leading-relaxed", className)} />;
}

/** Champ numérique qui accepte la virgule et renvoie null quand il est vide. */
export function NumberInput({
  value,
  onChange,
  className,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  // texte tapé gardé tel quel (« 1, » en cours de saisie) tant qu'il vaut la même chose
  const shown = value == null ? "" : String(value).replace(".", ",");
  const [text, setText] = useState(shown);
  const parse = (t: string) => (t.trim() === "" ? null : Number(t.replace(",", ".").trim()));
  const display = parse(text) === value ? text : shown;
  return (
    <input
      inputMode="decimal"
      {...rest}
      value={display}
      onChange={(e) => {
        const n = parse(e.target.value);
        if (n !== null && !isFinite(n)) return;
        setText(e.target.value);
        onChange(n);
      }}
      className={cx(inputBase, "min-h-12", className)}
    />
  );
}

/* ───────────── Feuille du bas (modale) ───────────── */

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-neutral-900/45" onClick={onClose} />
      <div className="pb-safe relative flex max-h-[92dvh] w-full max-w-lg flex-col gap-3 overflow-y-auto rounded-t-[36px] bg-bg px-5 pt-3 shadow-lg sm:rounded-[36px] sm:pb-6">
        <div className="mb-1 h-[5px] w-10 flex-none self-center rounded-full bg-neutral-400 sm:hidden" />
        {title && (
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-heading text-[28px] leading-tight">{title}</h2>
            <RoundButton label="Fermer" onClick={onClose} className="size-10">
              <IconClose size={20} />
            </RoundButton>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

/* ───────────── Divers ───────────── */

export function SectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cx("font-heading text-[24px] leading-tight", className)}>{children}</h2>;
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cx("inline-block size-5 animate-spin rounded-full border-[3px] border-current border-r-transparent", className)}
      aria-label="Chargement"
    />
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
      <p className="font-heading text-2xl">{title}</p>
      {children && <div className="text-neutral-700">{children}</div>}
    </div>
  );
}
