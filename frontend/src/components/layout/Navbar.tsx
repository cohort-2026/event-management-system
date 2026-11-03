import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import type { UserRole } from "@/types/user";

const roleLinks: Record<UserRole, { label: string; to: string }[]> = {
  ATTENDEE: [{ label: "Events", to: "/events" }],
  ORGANIZER: [
    { label: "Events", to: "/events" },
    { label: "Dashboard", to: "/organizer" },
  ],
  VENDOR: [
    { label: "Browse Events", to: "/vendor/events" },
    { label: "Dashboard", to: "/vendor" },
  ],
  ADMIN: [
    { label: "Events", to: "/events" },
    { label: "Admin", to: "/admin" },
    { label: "Vendor Reviews", to: "/admin/vendors" },
  ],
  PLATFORM_ADMIN: [{ label: "Settings", to: "/platform-admin/settings" }],
  MANAGEMENT: [{ label: "Reports", to: "/management/reports" }],
};

const publicLinks = [
  { label: "Events", to: "/events" },
  { label: "About", to: "#about" },
  { label: "Contact", to: "#contact" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [isDark, setIsDark] = useState(
    () => localStorage.getItem("eventms-theme") === "dark",
  );

  useEffect(() => {
    document
      .querySelector("[data-theme-scope]")
      ?.classList.toggle("dark", isDark);
  }, [isDark]);

  const links = user ? (roleLinks[user.role] ?? []) : publicLinks;
  const handleLogout = async () => {
    await logout();
    navigate("/login");
    setOpen(false);
  };
  const setTheme = (dark: boolean) => {
    localStorage.setItem("eventms-theme", dark ? "dark" : "light");
    setIsDark(dark);
  };

  const themeControl = (
    <div
      role="group"
      aria-label="Color theme"
      className="inline-flex items-center rounded-lg border border-neutral-200 bg-neutral-50 p-0.5 dark:border-neutral-700 dark:bg-neutral-900"
    >
      <button
        type="button"
        aria-pressed={!isDark}
        onClick={() => setTheme(false)}
        className={`rounded-md px-2 py-1 text-xs font-semibold transition-colors ${!isDark ? "bg-white text-neutral-900 shadow-xs dark:bg-neutral-700 dark:!text-white" : "text-neutral-600 hover:text-neutral-900 dark:!text-neutral-300 dark:hover:!text-white"}`}
      >
        Light
      </button>
      <button
        type="button"
        aria-pressed={isDark}
        onClick={() => setTheme(true)}
        className={`rounded-md px-2 py-1 text-xs font-semibold transition-colors ${isDark ? "bg-white text-neutral-900 shadow-xs dark:bg-neutral-700 dark:!text-white" : "text-neutral-600 hover:text-neutral-900 dark:!text-neutral-300 dark:hover:!text-white"}`}
      >
        Dark
      </button>
    </div>
  );

  return (
    <header className="bg-white border-b border-neutral-200 sticky top-0 z-40 shadow-xs dark:bg-neutral-950 dark:border-neutral-800">
      <div className="page-container flex items-center justify-between h-16">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-2.5 shrink-0"
          onClick={() => setOpen(false)}
        >
          <span className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center shadow-sm">
            <svg
              className="w-4.5 h-4.5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </span>
          <span className="font-extrabold text-neutral-900 text-lg tracking-tight dark:!text-white">
            EventMS
          </span>
        </Link>

        {/* Desktop nav */}
        <nav aria-label="Main" className="hidden md:flex items-center gap-1">
          {links.map((l) =>
            l.to.startsWith("#") ? (
              <a
                key={l.to}
                href={l.to}
                className="px-3.5 py-2 rounded-lg text-sm font-medium transition-colors duration-150 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 dark:!text-neutral-300 dark:hover:!text-white dark:hover:bg-neutral-800"
              >
                {l.label}
              </a>
            ) : (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `px-3.5 py-2 rounded-lg text-sm font-medium transition-colors duration-150
                ${isActive ? "text-brand-600 bg-brand-50 dark:bg-neutral-800 dark:!text-brand-300" : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 dark:!text-neutral-300 dark:hover:!text-white dark:hover:bg-neutral-800"}`
                }
              >
                {l.label}
              </NavLink>
            ),
          )}
        </nav>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-3">
          {themeControl}
          {user ? (
            <>
              <div className="flex items-center gap-2.5 pl-3 border-l border-neutral-200">
                <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 text-sm font-bold flex items-center justify-center">
                  {user.firstname.charAt(0)}
                </div>
                <span className="text-sm font-medium text-neutral-700 dark:!text-neutral-200">
                  {user.firstname} {user.lastname}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="text-sm font-semibold text-neutral-500 hover:text-rose-600 transition-colors px-2 py-1 dark:!text-neutral-300"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm font-semibold text-neutral-600 hover:text-neutral-900 transition-colors px-3 py-2 dark:!text-neutral-300 dark:hover:!text-white"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="text-sm font-semibold text-neutral-600 hover:text-neutral-900 transition-colors px-3 py-2 dark:!text-neutral-300 dark:hover:!text-white"
              >
                Sign up
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-100 transition-colors dark:!text-neutral-300 dark:hover:bg-neutral-800"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
          aria-expanded={open}
          aria-controls="mobile-navigation"
        >
          {open ? (
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          ) : (
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <nav
          id="mobile-navigation"
          aria-label="Mobile"
          className="md:hidden border-t border-neutral-100 bg-white px-4 py-3 flex flex-col gap-1 shadow-md dark:border-neutral-800 dark:bg-neutral-950"
        >
          {links.map((l) =>
            l.to.startsWith("#") ? (
              <a
                key={l.to}
                href={l.to}
                onClick={() => setOpen(false)}
                className="px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 transition-colors dark:!text-neutral-300 dark:hover:bg-neutral-800 dark:hover:!text-white"
              >
                {l.label}
              </a>
            ) : (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 transition-colors dark:!text-neutral-300 dark:hover:bg-neutral-800 dark:hover:!text-white"
              >
                {l.label}
              </Link>
            ),
          )}
          <div className="border-t border-neutral-100 mt-2 pt-3 flex flex-col gap-2 dark:border-neutral-800">
            <div className="px-3 py-2">{themeControl}</div>
            {user ? (
              <>
                <span className="px-3 text-sm font-medium text-neutral-500 dark:!text-neutral-300">
                  {user.firstname} {user.lastname}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors dark:hover:bg-rose-950"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="px-3 py-2.5 rounded-lg text-sm font-semibold text-neutral-700 hover:bg-neutral-100 transition-colors dark:!text-neutral-300 dark:hover:bg-neutral-800 dark:hover:!text-white"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  onClick={() => setOpen(false)}
                  className="px-3 py-2.5 rounded-lg text-sm font-semibold text-neutral-700 hover:bg-neutral-100 transition-colors dark:!text-neutral-300 dark:hover:bg-neutral-800 dark:hover:!text-white"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
