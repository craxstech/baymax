"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Apple,
  Bell,
  ClipboardList,
  FileText,
  HeartPulse,
  LayoutDashboard,
  Package,
  Pill,
  Settings,
  Siren,
  Sparkles,
  Stethoscope,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export function buildNavGroups(unreadNotifications = 0): NavGroup[] {
  return [
    {
      label: "Care overview",
      items: [
        { href: "/app", label: "Dashboard", icon: LayoutDashboard },
        { href: "/app/family", label: "Family", icon: Users },
        { href: "/app/medical-history", label: "Medical history", icon: ClipboardList },
        { href: "/app/reports", label: "Reports", icon: FileText },
      ],
    },
    {
      label: "Everyday care",
      items: [
        { href: "/app/ai-doctor", label: "AI family doctor", icon: Sparkles },
        { href: "/app/consultations", label: "Consultations", icon: Stethoscope },
        { href: "/app/medications", label: "Medications", icon: Pill },
        { href: "/app/prescriptions", label: "Prescriptions", icon: ClipboardList },
        { href: "/app/orders", label: "Pharmacy orders", icon: Package },
        { href: "/app/womens-health", label: "Women's health", icon: HeartPulse },
        { href: "/app/nutrition", label: "Nutrition", icon: Apple },
        { href: "/app/alerts", label: "Emergency & SOS", icon: Siren },
      ],
    },
    {
      label: "Account",
      items: [
        {
          href: "/app/notifications",
          label: "Notifications",
          icon: Bell,
          badge: unreadNotifications,
        },
        { href: "/app/settings", label: "Settings", icon: Settings },
      ],
    },
  ];
}

function isActive(pathname: string, href: string) {
  if (href === "/app") return pathname === "/app";
  if (href === "/app/settings") {
    return pathname.startsWith("/app/settings");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({ unreadNotifications = 0 }: { unreadNotifications?: number }) {
  const pathname = usePathname();
  const groups = buildNavGroups(unreadNotifications);

  return (
    <nav aria-label="Workspace navigation" className="space-y-6">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="sidebar-group-label mb-1.5">{group.label}</p>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="sidebar-link"
                  aria-current={active ? "page" : undefined}
                >
                  <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.badge ? (
                    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-aqua-600 px-1.5 py-0.5 text-[0.62rem] font-semibold leading-none text-white">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function MobileNav({
  unreadNotifications = 0,
  userName,
}: {
  unreadNotifications?: number;
  userName: string;
}) {
  const pathname = usePathname();
  const groups = buildNavGroups(unreadNotifications);
  const activeItem = groups
    .flatMap((group) => group.items)
    .filter((item) => isActive(pathname, item.href))
    .sort((a, b) => b.href.length - a.href.length)[0];

  return (
    <details className="group relative lg:hidden">
      <summary className="flex min-h-[42px] cursor-pointer list-none items-center gap-2 rounded-md border border-line bg-white px-2.5 text-[0.78rem] font-medium text-ink [&::-webkit-details-marker]:hidden">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-aqua-100 text-[0.62rem] font-semibold text-aqua-800">
          {userName
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part[0])
            .join("")}
        </span>
        <span className="max-w-[140px] truncate">{activeItem?.label ?? "Menu"}</span>
        <span className="text-[0.62rem] text-muted group-open:rotate-180" aria-hidden="true">
          ▾
        </span>
      </summary>
      <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-[70vh] overflow-y-auto rounded-lg border border-line bg-white p-3 shadow-md">
        <nav aria-label="Mobile workspace navigation" className="space-y-5">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="sidebar-group-label mb-1">{group.label}</p>
              <div className="grid grid-cols-2 gap-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn("sidebar-link min-h-[42px]", active && "active")}
                      aria-current={active ? "page" : undefined}
                    >
                      <Icon size={15} strokeWidth={1.8} aria-hidden="true" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </details>
  );
}
