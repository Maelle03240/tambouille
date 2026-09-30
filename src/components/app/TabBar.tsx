"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UI } from "@/config/ui";
import { useOpenReviewCount } from "@/lib/data/hooks";
import { IconBook, IconBookmark, IconCalendar, IconCart, IconLightbulb, IconSettings } from "@/components/ui/icons";
import { cx } from "@/components/ui/primitives";

/** Onglets disponibles ; lesquels s'affichent est réglé dans config/ui.ts. */
const TAB_DEFS = {
  recettes: { href: "/", label: "Recettes", Icon: IconBook },
  menu: { href: "/menu", label: "Menu", Icon: IconCalendar },
  courses: { href: "/courses", label: "Courses", Icon: IconCart },
  astuces: { href: "/astuces", label: "Astuces", Icon: IconLightbulb },
  "a-revoir": { href: "/a-revoir", label: "À revoir", Icon: IconBookmark },
  reglages: { href: "/reglages", label: "Réglages", Icon: IconSettings },
} as const;

export function TabBar() {
  const pathname = usePathname();
  const reviewCount = useOpenReviewCount();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-divider bg-bg/95 backdrop-blur-sm">
      <div className="pb-safe mx-auto grid max-w-2xl pt-1.5" style={{ gridTemplateColumns: `repeat(${UI.tabs.length}, 1fr)` }}>
        {UI.tabs.map((key) => {
          const { href, label, Icon } = TAB_DEFS[key];
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={key}
              href={href}
              className={cx(
                "relative flex flex-col items-center justify-center gap-0.5 py-1 text-[11px] font-bold",
                active ? "text-accent-700" : "text-neutral-700",
              )}
            >
              <Icon size={24} stroke={2.4} fill={active && key === "a-revoir" ? "currentColor" : "none"} />
              {label}
              {key === "a-revoir" && reviewCount > 0 && (
                <span className="absolute top-0 left-1/2 ml-2 min-w-5 rounded-full bg-accent-600 px-1.5 text-center text-[11px] leading-5 text-neutral-100">
                  {reviewCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
