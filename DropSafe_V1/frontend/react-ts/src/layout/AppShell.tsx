import { useMemo, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { DEMO_MODE } from '../api/http';
import { Avatar } from '../components/ui/primitives';
import { Icon } from './icons';
import { NAV } from './nav';

export function AppShell() {
  const { user, logout, canAny } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const groups = useMemo(
    () =>
      NAV.map((g) => ({
        ...g,
        items: g.items.filter((i) => !i.anyOf || canAny(...i.anyOf)),
      })).filter((g) => g.items.length > 0),
    [canAny],
  );

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebar = (
    <div className="flex h-full flex-col bg-slate-900 text-slate-300">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 font-bold text-white">DS</span>
        <div>
          <div className="text-sm font-bold text-white">DropSafe</div>
          <div className="text-[10px] uppercase tracking-wider text-slate-400">Early Intervention Platform</div>
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-6">
        {groups.map((g) => (
          <div key={g.title}>
            <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">{g.title}</div>
            <div className="space-y-0.5">
              {g.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition ${
                      isActive ? 'bg-brand-600/90 text-white' : 'hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  <Icon name={item.icon} />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-800 p-4">
        <div className="flex items-center gap-2.5">
          <Avatar name={user?.name} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold text-white">{user?.name}</div>
            <div className="truncate text-[10px] text-slate-400">{user?.roles.map((r) => r.replace(/_/g, ' ')).join(', ')}</div>
          </div>
          <button onClick={handleLogout} title="Sign out" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white">
            <Icon name="logout" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 lg:block">{sidebar}</aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64">{sidebar}</aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:px-6">
          <button className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden" onClick={() => setMobileOpen(true)}>
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-slate-800">{user?.organizationName}</div>
            <div className="text-[11px] text-slate-400">Organization scope enforced · all records isolated by tenant</div>
          </div>
          {DEMO_MODE && (
            <span className="hidden rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200 sm:inline">
              DEMO DATA — set VITE_DEMO_MODE=false to use your API
            </span>
          )}

          {/* User menu (sign out lives here too) */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-full p-0.5 pr-2 transition hover:bg-slate-100"
              aria-label="Open user menu"
            >
              <Avatar name={user?.name} />
              <svg
                className={`h-3.5 w-3.5 text-slate-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </button>
            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute right-0 z-40 mt-2 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                  <div className="px-4 py-3">
                    <div className="text-sm font-semibold text-slate-800">{user?.name}</div>
                    <div className="truncate text-[11px] text-slate-400">{user?.email}</div>
                    <div className="mt-1.5 text-[10px] font-bold uppercase tracking-wide text-brand-600">
                      {user?.roles.map((r) => r.replace(/_/g, ' ')).join(' · ')}
                    </div>
                  </div>
                  <div className="border-t border-slate-100 p-1.5">
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        handleLogout();
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                    >
                      <Icon name="logout" />
                      Sign out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
