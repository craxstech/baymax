import Link from "next/link";
import {
  Bell,
  ChevronRight,
  CircleHelp,
  LogOut,
  Settings,
  Shield,
  Siren,
  UserRound,
} from "lucide-react";
import { Logo } from "./brand";
import { MobileNav, SidebarNav } from "./app-nav";
import { logoutAction } from "@/app/actions/auth";
import type { CurrentUser } from "@/lib/auth";
import { initials } from "@/lib/utils";

export function AppSidebar({
  user,
  unreadNotifications,
}: {
  user: CurrentUser;
  unreadNotifications: number;
}) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[254px] flex-col border-r border-line bg-white lg:flex">
      <div className="flex h-[68px] flex-shrink-0 items-center border-b border-line px-5">
        <Logo href="/app" />
      </div>

      <div className="hide-scrollbar flex-1 overflow-y-auto px-3 py-5">
        <SidebarNav unreadNotifications={unreadNotifications} />
      </div>

      <div className="flex-shrink-0 border-t border-line p-3">
        <Link
          href="/app/alerts"
          className="flex items-center gap-2.5 rounded-md border border-[#efd0d4] bg-[#fff8f8] px-3 py-2.5 text-[0.76rem] font-semibold text-[#a62f3d] transition-colors hover:bg-[#fff2f3]"
        >
          <Siren size={15} aria-hidden="true" />
          Emergency &amp; SOS
        </Link>
        <div className="mt-2 flex items-center justify-between px-2 text-[0.66rem] text-muted">
          <Link href="/safety" className="inline-flex items-center gap-1 hover:text-aqua-700">
            <Shield size={11} aria-hidden="true" /> Safety
          </Link>
          <Link href="/contact" className="inline-flex items-center gap-1 hover:text-aqua-700">
            <CircleHelp size={11} aria-hidden="true" /> Help
          </Link>
        </div>
        <p className="mt-1.5 truncate px-2 text-[0.62rem] text-[#8a999e]">{user.email}</p>
      </div>
    </aside>
  );
}

export function AppTopbar({
  user,
  unreadNotifications,
}: {
  user: CurrentUser;
  unreadNotifications: number;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur-[6px]">
      <div className="flex h-[68px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <MobileNav unreadNotifications={unreadNotifications} userName={user.name} />
          <div className="hidden min-w-0 sm:block">
            <p className="truncate text-[0.72rem] font-medium text-muted">
              Private family health workspace
            </p>
            <p className="truncate text-[0.65rem] text-[#8a999e]">
              Access is checked on every request
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Link
            href="/app/ai-doctor"
            className="hidden items-center gap-1.5 rounded-md px-2.5 py-2 text-[0.75rem] font-medium text-[#52666e] hover:bg-aqua-50 hover:text-aqua-700 sm:inline-flex"
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-aqua-500" />
            Ask Baymax
          </Link>
          <Link
            href="/app/notifications"
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-[#52666e] hover:bg-aqua-50 hover:text-aqua-700"
            aria-label={
              unreadNotifications
                ? `Notifications, ${unreadNotifications} unread`
                : "Notifications"
            }
          >
            <Bell size={18} strokeWidth={1.8} aria-hidden="true" />
            {unreadNotifications > 0 && (
              <span className="absolute right-1 top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-aqua-600 px-1 py-0.5 text-[0.55rem] font-semibold leading-none text-white">
                {unreadNotifications > 9 ? "9+" : unreadNotifications}
              </span>
            )}
          </Link>

          <details className="group relative">
            <summary
              className="flex cursor-pointer list-none items-center gap-2 rounded-md border border-transparent p-1 pr-1.5 hover:border-line [&::-webkit-details-marker]:hidden"
              aria-label="Open account menu"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-aqua-100 text-[0.66rem] font-semibold text-aqua-800">
                {initials(user.name)}
              </span>
              <span className="hidden max-w-[120px] truncate text-[0.78rem] font-medium text-ink md:inline">
                {user.name.split(/\s+/)[0]}
              </span>
              <ChevronRight
                size={13}
                className="hidden text-muted transition-transform group-open:rotate-90 md:inline"
                aria-hidden="true"
              />
            </summary>
            <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-64 rounded-lg border border-line bg-white p-1.5 shadow-md">
              <div className="px-3 py-2.5">
                <p className="truncate text-[0.82rem] font-semibold text-ink">{user.name}</p>
                <p className="mt-0.5 truncate text-[0.68rem] text-muted">{user.email}</p>
                {user.isDemo && (
                  <span className="badge badge-warning mt-2">Synthetic demo account</span>
                )}
              </div>
              <div className="my-1 h-px bg-line" />
              <Link href="/app/settings" className="sidebar-link">
                <UserRound size={15} aria-hidden="true" /> Profile &amp; settings
              </Link>
              <Link href="/app/settings/security" className="sidebar-link">
                <Settings size={15} aria-hidden="true" /> Security &amp; sessions
              </Link>
              <Link href="/app/settings/privacy" className="sidebar-link">
                <Shield size={15} aria-hidden="true" /> Privacy &amp; consents
              </Link>
              <div className="my-1 h-px bg-line" />
              <form action={logoutAction}>
                <button type="submit" className="sidebar-link w-full text-left">
                  <LogOut size={15} aria-hidden="true" /> Sign out
                </button>
              </form>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
