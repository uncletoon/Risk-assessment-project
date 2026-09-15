import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { LogOut, ChevronDown, Menu, X, Settings } from "lucide-react";

interface TopNavbarProps {
  title: string;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export default function TopNavbar({
  title,
  onToggleSidebar,
  isSidebarOpen,
}: TopNavbarProps) {
  const { user, logout, isSystemAdmin } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadge = (role?: string) => {
    const r = (role || "").toUpperCase();
    if (r === "EMPLOYEE") {
      return {
        label: "Employee",
        bg: "bg-[#000047] text-white border-[#000047]",
      };
    }
    if (r === "RISK_OFFICER" || r === "OFFICER") {
      return {
        label: "Risk Officer",
        bg: "bg-secondary/15 text-secondary border-secondary/30",
      };
    }
    if (r === "SYSTEM_ADMIN" || r === "ADMIN") {
      return {
        label: "System Admin",
        bg: "bg-primary-container/10 text-primary border-primary-container/30",
      };
    }
    return {
      label: "Risk Officer",
      bg: "bg-secondary/15 text-secondary border-secondary/30",
    };
  };

  const roleInfo = getRoleBadge(user?.role);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="flex justify-between items-center h-16 px-4 sm:px-6 bg-surface-bright border-b border-outline-variant shadow-xs sticky top-0 z-20 w-full">
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile Hamburger Menu Toggle */}
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-xl text-on-surface hover:bg-surface-container transition-colors cursor-pointer shrink-0"
          aria-label="Toggle navigation menu"
        >
          {isSidebarOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </button>

        <div className="flex items-center gap-2.5 min-w-0">
          <h2 className="text-base sm:text-lg lg:text-xl font-extrabold text-primary tracking-tight truncate">
            {title}
          </h2>
          <span
            className={`hidden sm:inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${roleInfo.bg}`}
          >
            {roleInfo.label}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {/* User Profile Menu */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 sm:gap-3 pl-2 sm:pl-3 border-l border-outline-variant hover:opacity-85 transition-opacity text-left cursor-pointer focus:outline-none"
          >
            <div className="text-right hidden md:block">
              <p className="text-xs font-bold text-on-surface leading-tight">
                {user?.full_name || "User"}
              </p>
              <p className="text-[11px] font-medium text-on-surface-variant leading-tight mt-0.5 truncate max-w-[160px]">
                {isSystemAdmin
                  ? user?.department || "System Governance"
                  : user?.organization_name ||
                    user?.department ||
                    "Enterprise Risk"}
              </p>
            </div>
            <div className="w-9 h-9 rounded-full border border-outline-variant bg-primary-container flex items-center justify-center text-on-primary text-xs font-bold shadow-xs">
              {getInitials(user?.full_name)}
            </div>
            <ChevronDown className="w-4 h-4 text-on-surface-variant shrink-0" />
          </button>

          {/* User Profile Dropdown */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-3 border-b border-outline-variant/60 bg-surface-container-low">
                <p className="text-xs font-bold text-on-surface">
                  {user?.full_name || "Authenticated User"}
                </p>
                <p className="text-[11px] font-medium text-on-surface-variant truncate mt-0.5">
                  {user?.email}
                </p>
                {user?.phone_number && (
                  <p className="text-[10px] text-on-surface-variant truncate mt-0.5">
                    {user.phone_number}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${roleInfo.bg}`}
                  >
                    {roleInfo.label}
                  </span>
                  {user?.gender && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-surface-container text-on-surface-variant border-outline-variant/60">
                      {user.gender}
                    </span>
                  )}
                </div>
              </div>

              {/* Settings / Profile link */}
              <div className="py-1 border-b border-outline-variant/40">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate("/organization");
                  }}
                  className="w-full text-left px-4 py-2 text-xs font-semibold text-primary hover:bg-surface-container transition-colors flex items-center justify-between cursor-pointer"
                >
                  <span>
                    {isSystemAdmin
                      ? "Admin Profile Settings"
                      : "Profile & Organization"}
                  </span>
                  <Settings className="w-3.5 h-3.5 text-on-surface-variant" />
                </button>
              </div>

              {/* Log Out Option */}
              <div className="pt-1">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2.5 text-xs font-bold text-error hover:bg-error-container/20 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
