import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "./utils";
import { LayoutDashboard, List, TrendingUp, BarChart2, Menu, X, Wifi, User, Clock, Calculator as CalculatorIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "./lib/AuthContext";
import Calculator from "@/components/Calculator";

const NAV_ITEMS = [
  { name: "Dashboard", icon: LayoutDashboard, page: "Dashboard" },
  { name: "Dívidas", icon: List, page: "Debts" },
  { name: "Entradas", icon: TrendingUp, page: "Incomes" },
  { name: "Relatórios", icon: BarChart2, page: "Reports" },
];

export default function Layout({ children, currentPageName }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const { user } = useAuth();
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    setLastUpdate(new Date());
  }, [currentPageName]);

  return (
    <div className="h-screen bg-[#0B0F19] flex flex-col overflow-hidden">
      {/* Top nav */}
      <nav className="flex-none sticky top-0 z-50 bg-[#0B0F19]/80 backdrop-blur-xl border-b border-white/[0.04]">
        <div className="w-full px-4 sm:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-6">
              <Link to={createPageUrl("Dashboard")} className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">D</span>
                </div>
                <span className="text-white font-semibold text-sm tracking-tight hidden sm:block">DebtFlow</span>
              </Link>

              {/* Desktop nav */}
              <div className="hidden sm:flex items-center gap-1">
                {NAV_ITEMS.map(item => {
                  const active = currentPageName === item.page;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.page}
                      to={createPageUrl(item.page)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
                        active
                          ? "bg-white/[0.08] text-white"
                          : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Calculator button + Mobile toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCalculatorOpen(true)}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 hover:text-white transition-all"
              >
                <CalculatorIcon className="w-4 h-4" />
                <span className="hidden lg:inline">Calculadora</span>
              </button>
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="sm:hidden text-slate-400 hover:text-white p-1"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="sm:hidden border-t border-white/[0.04] overflow-hidden"
            >
              <div className="px-4 py-3 space-y-1">
                {NAV_ITEMS.map(item => {
                  const active = currentPageName === item.page;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.page}
                      to={createPageUrl(item.page)}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                        active
                          ? "bg-emerald-600/10 text-emerald-400"
                          : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.name}
                    </Link>
                  );
                })}
                <button
                  onClick={() => { setCalculatorOpen(true); setMobileOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/[0.04] transition-all"
                >
                  <CalculatorIcon className="w-4 h-4" />
                  Calculadora
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        {children}
      </main>

      {/* Status Bar */}
      <footer className="flex-none h-7 bg-[#0B0F19] border-t border-white/[0.04] px-4 flex items-center justify-between text-[10px] text-slate-500">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <motion.span
              className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
              animate={{ scale: [1, 1.5, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1.5, repeat: Infinity, repeatType: "mirror" }}
            />
            <span className="uppercase tracking-wider font-medium text-slate-400">Sistema Online</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 border-l border-white/[0.04] pl-4">
            <motion.span
              animate={{ y: [0, -1.5, 0], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2, repeat: Infinity, repeatType: "mirror" }}
            >
              <Wifi className="w-3 h-3 text-cyan-300" />
            </motion.span>
            <span className="text-cyan-200">Firebase Realtime Ativo</span>
          </div>
          <div className="hidden md:flex items-center gap-1.5 border-l border-white/[0.04] pl-4">
            <Clock className="w-3 h-3" />
            <span>Vencimentos: Hoje</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <User className="w-3 h-3 text-emerald-500/60" />
            <span className="text-slate-400">{user?.name || user?.email || "Usuário Local"}</span>
          </div>
          <div className="border-l border-white/[0.04] pl-4 text-emerald-500/40 font-mono">
            v1.2.0-stable
          </div>
        </div>
      </footer>

      {/* Calculator Modal */}
      <AnimatePresence>
        {calculatorOpen && <Calculator onClose={() => setCalculatorOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}
