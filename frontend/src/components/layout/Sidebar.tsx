import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";
import {
  LayoutDashboard,
  Building2,
  FilePlus2,
  FileSpreadsheet,
  ShieldAlert,
  History,
  FileText,
  Users,
  Sliders,
  Scale,
  Activity,
  HeartPulse,
  ShieldCheck,
  User,
  X,
} from "lucide-react";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, isSystemAdmin, isRiskOfficer, isEmployee } = useAuth();
  const [orgName, setOrgName] = useState(
    user?.organization_name || "Enterprise",
  );
  const [orgIndustry, setOrgIndustry] = useState(
    "Financial & Enterprise Services",
  );

  useEffect(() => {
    if (user?.organization_name) {
      setOrgName(user.organization_name);
    }
    const loadOrg = async () => {
      try {
        const orgs = await api.getOrganizations();
        if (orgs.length > 0) {
          const matched =
            orgs.find((o) => o.id === user?.organization_id) || orgs[0];
          setOrgName(matched.name);
          setOrgIndustry(matched.industry || "Financial & Enterprise Services");
        }
      } catch (err) {
        // fallback
      }
    };
    if (!isSystemAdmin) {
      loadOrg();
    }
  }, [user, isSystemAdmin]);

  const handleNavClick = () => {
    if (onClose && window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      <nav
        className={`fixed left-0 top-0 h-full flex flex-col py-5 bg-primary-container w-[280px] z-40 shadow-2xl border-r border-outline-variant/10 text-on-primary transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="px-6 mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary-container flex items-center justify-center shrink-0 shadow-md">
              <ShieldAlert className="w-6 h-6 text-on-secondary-container" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wide leading-tight text-surface-container-lowest">
                ERIDSS
              </h1>
              <p className="text-[10px] text-on-primary-container font-semibold tracking-wider uppercase">
                {isEmployee
                  ? "Employee Portal"
                  : "Risk Intelligence & Decision"}
              </p>
            </div>
          </div>

          {/* Close button on small screens */}
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 text-on-primary-container hover:text-white rounded-lg cursor-pointer"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Enterprise Identity Card for Non-Admin */}
        {!isSystemAdmin && (
          <div className="mx-4 mb-4 p-3 rounded-2xl bg-surface-container-highest/20 border border-outline-variant/15 flex items-center gap-3 shadow-inner">
            <div className="w-9 h-9 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-secondary-fixed-dim block">
                {isEmployee ? "Assigned Enterprise" : "Enterprise Workspace"}
              </span>
              <p
                className="text-xs font-bold text-surface-container-lowest truncate"
                title={orgName}
              >
                {orgName}
              </p>
              <span className="text-[10px] text-on-primary-container font-medium block truncate">
                {isEmployee ? user?.department || "Operations" : orgIndustry}
              </span>
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <div className="flex-1 px-4 space-y-1.5 overflow-y-auto custom-scrollbar">
          {/* 1. EMPLOYEE NAVIGATION */}
          {isEmployee && (
            <>
              <div className="px-3 pt-2 pb-1 text-[10px] font-black uppercase tracking-wider text-on-primary-container/80">
                Document Submissions
              </div>

              <NavLink
                to="/employee/dashboard"
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "text-secondary-container bg-surface-container-highest/25 font-bold shadow-xs"
                      : "text-on-primary-container hover:text-surface-container-lowest hover:bg-surface-container-highest/15"
                  }`
                }
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Submit & View Documents</span>
              </NavLink>

              <NavLink
                to="/organization"
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "text-secondary-container bg-surface-container-highest/25 font-bold shadow-xs"
                      : "text-on-primary-container hover:text-surface-container-lowest hover:bg-surface-container-highest/15"
                  }`
                }
              >
                <User className="w-4 h-4" />
                <span>My Profile</span>
              </NavLink>
            </>
          )}

          {/* 2. RISK OFFICER NAVIGATION */}
          {!isSystemAdmin && !isEmployee && (
            <>
              <NavLink
                to="/dashboard"
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "text-secondary-container bg-surface-container-highest/25 font-bold shadow-xs"
                      : "text-on-primary-container hover:text-surface-container-lowest hover:bg-surface-container-highest/15"
                  }`
                }
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Executive Dashboard</span>
              </NavLink>

              <NavLink
                to="/assessments/new"
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "text-secondary-container bg-surface-container-highest/25 font-bold shadow-xs"
                      : "text-on-primary-container hover:text-surface-container-lowest hover:bg-surface-container-highest/15"
                  }`
                }
              >
                <FilePlus2 className="w-4 h-4" />
                <span>New Assessment (1-Doc)</span>
              </NavLink>

              <NavLink
                to="/assessments"
                end
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "text-secondary-container bg-surface-container-highest/25 font-bold shadow-xs"
                      : "text-on-primary-container hover:text-surface-container-lowest hover:bg-surface-container-highest/15"
                  }`
                }
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Assessments Repository</span>
              </NavLink>

              <NavLink
                to="/mitigations"
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "text-secondary-container bg-surface-container-highest/25 font-bold shadow-xs"
                      : "text-on-primary-container hover:text-surface-container-lowest hover:bg-surface-container-highest/15"
                  }`
                }
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Mitigation Actions</span>
              </NavLink>

              <NavLink
                to="/history"
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "text-secondary-container bg-surface-container-highest/25 font-bold shadow-xs"
                      : "text-on-primary-container hover:text-surface-container-lowest hover:bg-surface-container-highest/15"
                  }`
                }
              >
                <History className="w-4 h-4" />
                <span>Longitudinal Trends</span>
              </NavLink>

              <NavLink
                to="/reports"
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "text-secondary-container bg-surface-container-highest/25 font-bold shadow-xs"
                      : "text-on-primary-container hover:text-surface-container-lowest hover:bg-surface-container-highest/15"
                  }`
                }
              >
                <FileText className="w-4 h-4" />
                <span>Audit-Ready Reports</span>
              </NavLink>

              <div className="px-3 pt-2 pb-1 text-[10px] font-black uppercase tracking-wider text-on-primary-container/80">
                Risk Rules & Scoring Engine
              </div>

              <NavLink
                to="/admin/categories"
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "text-secondary-container bg-surface-container-highest/25 font-bold shadow-xs"
                      : "text-on-primary-container hover:text-surface-container-lowest hover:bg-surface-container-highest/15"
                  }`
                }
              >
                <Sliders className="w-4 h-4" />
                <span>Risk Categories & Weights</span>
              </NavLink>

              <NavLink
                to="/admin/rules"
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "text-secondary-container bg-surface-container-highest/25 font-bold shadow-xs"
                      : "text-on-primary-container hover:text-surface-container-lowest hover:bg-surface-container-highest/15"
                  }`
                }
              >
                <Scale className="w-4 h-4" />
                <span>Risk Rules Engine</span>
              </NavLink>

              <NavLink
                to="/organization"
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "text-secondary-container bg-surface-container-highest/25 font-bold shadow-xs"
                      : "text-on-primary-container hover:text-surface-container-lowest hover:bg-surface-container-highest/15"
                  }`
                }
              >
                <Building2 className="w-4 h-4" />
                <span>Enterprise & Employees</span>
              </NavLink>
            </>
          )}

          {/* 3. SYSTEM ADMIN NAVIGATION */}
          {isSystemAdmin && (
            <>
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-on-primary-container mt-3 mb-1">
                System Governance
              </p>

              <NavLink
                to="/admin/users"
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "text-secondary-container bg-surface-container-highest/25 font-bold shadow-xs"
                      : "text-on-primary-container hover:text-surface-container-lowest hover:bg-surface-container-highest/15"
                  }`
                }
              >
                <Users className="w-4 h-4" />
                <span>User Accounts</span>
              </NavLink>

              <NavLink
                to="/admin/categories"
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "text-secondary-container bg-surface-container-highest/25 font-bold shadow-xs"
                      : "text-on-primary-container hover:text-surface-container-lowest hover:bg-surface-container-highest/15"
                  }`
                }
              >
                <Sliders className="w-4 h-4" />
                <span>Risk Categories & Weights</span>
              </NavLink>

              <NavLink
                to="/admin/rules"
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "text-secondary-container bg-surface-container-highest/25 font-bold shadow-xs"
                      : "text-on-primary-container hover:text-surface-container-lowest hover:bg-surface-container-highest/15"
                  }`
                }
              >
                <Scale className="w-4 h-4" />
                <span>Deterministic Rules Engine</span>
              </NavLink>

              <NavLink
                to="/admin/audit-logs"
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "text-secondary-container bg-surface-container-highest/25 font-bold shadow-xs"
                      : "text-on-primary-container hover:text-surface-container-lowest hover:bg-surface-container-highest/15"
                  }`
                }
              >
                <Activity className="w-4 h-4" />
                <span>System Audit Logs</span>
              </NavLink>

              <NavLink
                to="/admin/health"
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "text-secondary-container bg-surface-container-highest/25 font-bold shadow-xs"
                      : "text-on-primary-container hover:text-surface-container-lowest hover:bg-surface-container-highest/15"
                  }`
                }
              >
                <HeartPulse className="w-4 h-4" />
                <span>Database & System Health</span>
              </NavLink>
            </>
          )}
        </div>

        {/* Bottom Profile / Organization Link */}
        <div className="px-3 pt-3 border-t border-outline-variant/20">
          <NavLink
            to="/organization"
            onClick={handleNavClick}
            className={({ isActive }) =>
              `flex items-center gap-3 p-2.5 rounded-xl transition-all ${
                isActive
                  ? "text-secondary-container bg-surface-container-highest/30 font-bold shadow-xs"
                  : "text-on-primary-container hover:text-surface-container-lowest hover:bg-surface-container-highest/15"
              }`
            }
          >
            <div className="w-9 h-9 rounded-xl bg-surface-container-highest/25 text-secondary-container flex items-center justify-center font-bold text-xs shrink-0 border border-outline-variant/30">
              {isSystemAdmin ? (
                <User className="w-4 h-4" />
              ) : (
                <Building2 className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p
                className="text-xs font-bold text-surface-container-lowest truncate leading-tight"
                title={
                  isSystemAdmin ? user?.full_name || "System Admin" : orgName
                }
              >
                {isSystemAdmin ? user?.full_name || "System Admin" : orgName}
              </p>
              <p
                className="text-[10px] text-on-primary-container font-medium truncate mt-0.5"
                title={isSystemAdmin ? "Administrator Account" : orgIndustry}
              >
                {isSystemAdmin ? "Admin Account Profile" : orgIndustry}
              </p>
            </div>
          </NavLink>
        </div>
      </nav>
    </>
  );
}
