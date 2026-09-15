import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  ShieldAlert,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  UserPlus,
} from "lucide-react";

export default function Login() {
  const { login, loading, error } = useAuth();
  const [email, setEmail] = useState("officer@eridss.com");
  const [password, setPassword] = useState("Officer@123");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(email, password);
  };

  const handleQuickLogin = (roleEmail: string, rolePass: string) => {
    setEmail(roleEmail);
    setPassword(rolePass);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-on-surface">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        <div className="w-14 h-14 rounded-2xl bg-secondary-container text-on-secondary-container flex items-center justify-center mx-auto shadow-lg mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-primary">
          ERIDSS
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-on-surface-variant font-bold">
          Enterprise Risk Intelligence and Decision Support System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-surface-container-lowest py-8 px-6 shadow-xl rounded-2xl sm:px-10 border border-outline-variant">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-error-container text-on-error-container text-xs font-bold flex items-center gap-2 border border-error/40">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-primary mb-1.5">
                Corporate Email Address
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-primary">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm font-semibold text-primary placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="name@enterprise.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-primary mb-1.5">
                Security Password
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-primary">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm font-semibold text-primary placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-on-primary bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary shadow-md transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span>Authenticating Credentials...</span>
              ) : (
                <>
                  <span>Sign In to Risk Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Register New Organization / Officer Account Link */}
          <div className="mt-6 pt-5 border-t border-outline-variant text-center">
            <p className="text-xs text-on-surface-variant mb-3 font-medium">
              Need a new enterprise risk profile?
            </p>
            <Link
              to="/register"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 text-xs font-black text-primary transition-all shadow-xs"
            >
              <UserPlus className="w-4 h-4 text-primary" />
              <span>Register</span>
            </Link>
          </div>

          {/* Quick Demo Role Selector */}
          <div className="mt-6 pt-5 border-t border-outline-variant">
            <p className="text-[11px] uppercase tracking-wider font-extrabold text-primary text-center mb-3">
              Fast Demo Credential Switcher
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() =>
                  handleQuickLogin("officer@eridss.com", "Officer@123")
                }
                className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-outline-variant bg-surface-container-low hover:bg-surface-container text-xs font-bold text-primary transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-secondary" />
                <span>Risk Officer</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleQuickLogin("admin@eridss.com", "Admin@123")
                }
                className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-outline-variant bg-surface-container-low hover:bg-surface-container text-xs font-bold text-primary transition-colors cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5 text-primary" />
                <span>System Admin</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
