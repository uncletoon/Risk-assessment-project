import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import {
  validateFullName,
  validateEmail,
  validatePhoneNumber,
  validatePassword,
  validateRequired,
} from "../../lib/validation";
import {
  Users,
  Plus,
  Phone,
  AlertCircle,
  User as UserIcon,
  Mail,
  Lock,
  Building,
  Eye,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  MapPin,
  Briefcase,
  Layers,
  FileSpreadsheet,
  Activity,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
  ChevronRight,
} from "lucide-react";

export default function UserManagement() {
  const { user: currentAdmin } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modals & Drawers
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [userDetails, setUserDetails] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const getRoleBadgeInfo = (role?: string) => {
    const r = (role || "").toUpperCase();
    if (r === "EMPLOYEE") {
      return {
        label: "Employee",
        className: "bg-[#000047] text-white border-[#000047]",
      };
    }
    if (r === "SYSTEM_ADMIN" || r === "ADMIN") {
      return {
        label: "System Admin",
        className: "bg-primary/10 text-primary border-primary/30",
      };
    }
    return {
      label: "Risk Officer",
      className: "bg-secondary/15 text-secondary border-secondary/30",
    };
  };

  // New User Form State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [gender, setGender] = useState("Male");
  const [password, setPassword] = useState("Officer@123");
  const [role, setRole] = useState("RISK_OFFICER");
  const [department, setDepartment] = useState("Corporate Risk");
  const [saving, setSaving] = useState(false);

  // Form Errors State
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [departmentError, setDepartmentError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const list = await api.getAdminUsers();
      setUsers(list);
    } catch (err: any) {
      console.error("Failed to load users:", err);
      showNotification("error", err.message || "Failed to load user accounts.");
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const handleOpenDetails = async (userId: number) => {
    setSelectedUserId(userId);
    setLoadingDetails(true);
    try {
      const data = await api.getAdminUserDetails(userId);
      setUserDetails(data);
    } catch (err: any) {
      showNotification("error", err.message || "Failed to load user details.");
      setSelectedUserId(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCloseDetails = () => {
    setSelectedUserId(null);
    setUserDetails(null);
  };

  const handleToggleStatus = async (userId: number, currentStatus: string) => {
    if (
      currentAdmin &&
      currentAdmin.id === userId &&
      (currentStatus === "active" || !currentStatus)
    ) {
      showNotification(
        "error",
        "You cannot deactivate your own Administrator account.",
      );
      return;
    }

    const newStatus =
      currentStatus === "active" || currentStatus === "ACTIVE"
        ? "inactive"
        : "active";
    setActionLoadingId(userId);

    try {
      const updated = await api.updateAdminUserStatus(userId, newStatus);

      // Update in local users table
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, status: updated.status } : u,
        ),
      );

      // Update in details drawer if open
      if (userDetails && userDetails.id === userId) {
        setUserDetails((prev: any) => ({ ...prev, status: updated.status }));
      }

      showNotification(
        "success",
        `User account ${updated.email} is now ${updated.status === "active" ? "ACTIVE" : "DEACTIVATED"}.`,
      );
    } catch (err: any) {
      showNotification(
        "error",
        err.message || "Failed to update user account status.",
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  // Form Handlers
  const handleNameChange = (val: string) => {
    setFullName(val);
    const res = validateFullName(val);
    setNameError(res.error);
  };

  const handleEmailChange = (val: string) => {
    setEmail(val);
    const res = validateEmail(val, true);
    setEmailError(res.error);
  };

  const handlePhoneChange = (val: string) => {
    setPhoneNumber(val);
    const res = validatePhoneNumber(val);
    setPhoneError(res.error);
  };

  const handlePasswordChange = (val: string) => {
    setPassword(val);
    const res = validatePassword(val);
    setPasswordError(res.error);
  };

  const handleDepartmentChange = (val: string) => {
    setDepartment(val);
    const res = validateRequired(val, "Department", 2);
    setDepartmentError(res.error);
  };

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setPhoneNumber("");
    setPassword("Officer@123");
    setRole("RISK_OFFICER");
    setDepartment("Corporate Risk");
    setNameError(null);
    setEmailError(null);
    setPhoneError(null);
    setPasswordError(null);
    setDepartmentError(null);
    setIsAddModalOpen(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    const nameRes = validateFullName(fullName);
    const emailRes = validateEmail(email, true);
    const phoneRes = validatePhoneNumber(phoneNumber);
    const passRes = validatePassword(password);
    const deptRes = validateRequired(department, "Department", 2);

    setNameError(nameRes.error);
    setEmailError(emailRes.error);
    setPhoneError(phoneRes.error);
    setPasswordError(passRes.error);
    setDepartmentError(deptRes.error);

    if (
      !nameRes.isValid ||
      !emailRes.isValid ||
      !phoneRes.isValid ||
      !passRes.isValid ||
      !deptRes.isValid
    ) {
      return;
    }

    setSaving(true);
    try {
      await api.createAdminUser({
        full_name: fullName,
        email,
        phone_number: phoneNumber,
        gender,
        password,
        role,
        department,
      });

      showNotification(
        "success",
        `User account ${email} created successfully.`,
      );
      resetForm();
      await fetchUsers();
    } catch (err: any) {
      showNotification("error", err.message || "Failed to create user.");
    } finally {
      setSaving(false);
    }
  };

  // Filtered Users List
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      (u.full_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.organization_name || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      (u.department || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole =
      roleFilter === "ALL" ||
      (roleFilter === "ADMIN" &&
        (u.role === "SYSTEM_ADMIN" || u.role === "ADMIN")) ||
      (roleFilter === "OFFICER" &&
        (u.role === "RISK_OFFICER" ||
          u.role === "OFFICER" ||
          u.role === "EMPLOYEE"));

    const isUserActive = (u.status || "active").toLowerCase() === "active";
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && isUserActive) ||
      (statusFilter === "INACTIVE" && !isUserActive);

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-5 right-5 z-50 p-4 rounded-xl shadow-xl flex items-center gap-3 text-xs font-bold border animate-in slide-in-from-top duration-300 ${
            notification.type === "success"
              ? "bg-tertiary-container text-on-tertiary-container border-tertiary-fixed-dim"
              : "bg-error-container text-on-error-container border-error"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-on-tertiary-container shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-on-error-container shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-container-lowest p-5 sm:p-6 rounded-2xl border border-outline-variant shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-primary">
              System Governance
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-primary tracking-tight">
            User Accounts & Access Control
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant font-medium mt-0.5">
            Inspect officer profiles, verify corporate organizations, and manage
            active / deactivated access status.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 shadow-sm transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Provision New User</span>
        </button>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, org, or dept..."
            className="w-full pl-9 pr-3.5 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-semibold text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-on-surface-variant" />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-1.5 bg-surface-container-low px-3 py-1.5 rounded-xl border border-outline-variant">
            <Filter className="w-3.5 h-3.5 text-secondary" />
            <span className="font-bold text-[11px] text-primary">Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-primary focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Roles</option>
              <option value="OFFICER">Risk Officers</option>
              <option value="ADMIN">System Admins</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-surface-container-low px-3 py-1.5 rounded-xl border border-outline-variant">
            <span className="font-bold text-[11px] text-primary">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-primary focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Deactivated Only</option>
            </select>
          </div>

          <div className="text-[11px] font-bold text-on-surface-variant px-2">
            {filteredUsers.length} of {users.length} users
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-primary">
            <div className="w-8 h-8 border-3 border-secondary border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-xs font-bold">Loading User Accounts...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-on-surface-variant">
            <Users className="w-10 h-10 mx-auto text-secondary mb-2 opacity-50" />
            <p className="text-sm font-bold text-primary">
              No user accounts found matching your filters.
            </p>
            <p className="text-xs font-medium mt-1">
              Try adjusting your search query or role/status filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low text-[11px] font-black uppercase tracking-wider text-primary">
                  <th className="py-3.5 px-5">User Details</th>
                  <th className="py-3.5 px-4">Contact Info</th>
                  <th className="py-3.5 px-4">Role & Dept</th>
                  <th className="py-3.5 px-4">Assigned Business</th>
                  <th className="py-3.5 px-4">Account Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {filteredUsers.map((u) => {
                  const isActive =
                    (u.status || "active").toLowerCase() === "active";
                  const isSelf = Boolean(
                    currentAdmin && currentAdmin.id === u.id,
                  );
                  const initials = (u.full_name || "U")
                    .split(" ")
                    .map((n: string) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase();

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-surface-container-low/60 transition-colors group"
                    >
                      {/* Name & Avatar */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-black text-xs shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="font-black text-primary truncate max-w-[160px]"
                                title={u.full_name}
                              >
                                {u.full_name}
                              </span>
                              {isSelf && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-primary/10 text-primary border border-primary/30">
                                  You
                                </span>
                              )}
                            </div>
                            <p
                              className="text-[11px] text-on-surface-variant truncate max-w-[180px]"
                              title={u.email}
                            >
                              {u.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="py-4 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1 text-[11px] font-semibold text-primary">
                            <Phone className="w-3 h-3 text-secondary shrink-0" />
                            <span>{u.phone_number || "No phone recorded"}</span>
                          </div>
                          <p className="text-[10px] text-on-surface-variant font-medium">
                            Gender: {u.gender || "Not specified"}
                          </p>
                        </div>
                      </td>

                      {/* Role & Dept */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          {(() => {
                            const rInfo = getRoleBadgeInfo(u.role);
                            return (
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold border ${rInfo.className}`}
                              >
                                {rInfo.label}
                              </span>
                            );
                          })()}
                          <p className="text-[10px] text-on-surface-variant font-semibold">
                            {u.department || "Corporate Risk"}
                          </p>
                        </div>
                      </td>

                      {/* Assigned Business */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-primary max-w-[170px]">
                          <Building className="w-3.5 h-3.5 text-secondary shrink-0" />
                          <span
                            className="truncate"
                            title={
                              u.organization_name || "System Administrator"
                            }
                          >
                            {u.role === "SYSTEM_ADMIN" || u.role === "ADMIN"
                              ? "Governance Portal"
                              : u.organization_name || "Unassigned"}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black border ${
                            isActive
                              ? "bg-tertiary-container/30 text-on-tertiary-container border-tertiary-fixed-dim/60"
                              : "bg-error-container/60 text-on-error-container border-error/50"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isActive
                                ? "bg-on-tertiary-container animate-pulse"
                                : "bg-on-error-container"
                            }`}
                          />
                          <span>{isActive ? "ACTIVE" : "DEACTIVATED"}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Toggle Status Button */}
                          <button
                            onClick={() => handleToggleStatus(u.id, u.status)}
                            disabled={actionLoadingId === u.id || isSelf}
                            title={
                              isSelf
                                ? "Cannot deactivate your own account"
                                : isActive
                                  ? "Click to Deactivate user account"
                                  : "Click to Activate user account"
                            }
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                              isSelf
                                ? "opacity-40 cursor-not-allowed bg-surface-container border-outline-variant text-on-surface-variant"
                                : isActive
                                  ? "bg-error/10 hover:bg-error/20 text-error border-error/30"
                                  : "bg-tertiary-container/30 hover:bg-tertiary-container text-on-tertiary-container border-tertiary-fixed-dim/60"
                            }`}
                          >
                            {actionLoadingId === u.id ? (
                              <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            ) : isActive ? (
                              <>
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Deactivate</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Activate</span>
                              </>
                            )}
                          </button>

                          {/* View Details Button */}
                          <button
                            onClick={() => handleOpenDetails(u.id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant text-primary text-[11px] font-bold transition-all cursor-pointer"
                            title="Inspect complete user details"
                          >
                            <Eye className="w-3.5 h-3.5 text-secondary" />
                            <span>Details</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* USER DETAILS SLIDE-OVER / MODAL */}
      {selectedUserId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 max-w-2xl w-full shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-secondary-container text-on-secondary-container flex items-center justify-center font-black text-sm shadow-sm">
                  {userDetails?.full_name
                    ? userDetails.full_name
                        .split(" ")
                        .map((n: string) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()
                    : "U"}
                </div>
                <div>
                  <h3 className="text-base font-black text-primary">
                    {userDetails?.full_name || "User Profile Details"}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-on-surface-variant font-semibold">
                      Account ID #{userDetails?.id}
                    </span>
                    <span
                      className={`inline-block px-2 py-0.2 rounded text-[10px] font-black border ${
                        getRoleBadgeInfo(userDetails?.role).className
                      }`}
                    >
                      {getRoleBadgeInfo(userDetails?.role).label}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleCloseDetails}
                className="w-8 h-8 rounded-lg bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-primary font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {loadingDetails ? (
              <div className="py-16 text-center text-primary">
                <div className="w-8 h-8 border-3 border-secondary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-xs font-bold">
                  Fetching comprehensive profile & activity logs...
                </p>
              </div>
            ) : userDetails ? (
              <div className="space-y-5 text-xs">
                {/* Status Switcher Banner */}
                <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-primary block">
                      Account Access Status
                    </span>
                    <p className="text-[11px] text-on-surface-variant font-medium mt-0.5">
                      {userDetails.status === "active"
                        ? "User currently has authorized access to authenticate and execute assessments."
                        : "User account is deactivated and blocked from logging in or executing actions."}
                    </p>
                  </div>

                  <button
                    onClick={() =>
                      handleToggleStatus(userDetails.id, userDetails.status)
                    }
                    disabled={Boolean(
                      actionLoadingId === userDetails.id ||
                        (currentAdmin && currentAdmin.id === userDetails.id),
                    )}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs ${
                      userDetails.status === "active"
                        ? "bg-error-container text-on-error-container hover:bg-error-container/80 border border-error/40"
                        : "bg-tertiary-container text-on-tertiary-container hover:bg-tertiary-container/80 border border-tertiary-fixed-dim"
                    }`}
                  >
                    {actionLoadingId === userDetails.id ? (
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    ) : userDetails.status === "active" ? (
                      <>
                        <XCircle className="w-4 h-4 text-on-error-container" />
                        <span>Deactivate Account</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-on-tertiary-container" />
                        <span>Activate Account</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Grid 1: Personal & Contact Information */}
                <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-primary">
                    <UserIcon className="w-4 h-4 text-primary" />
                    <span>Personal & Contact Credentials</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase">
                        Full Legal Name
                      </span>
                      <p className="font-bold text-primary">
                        {userDetails.full_name}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase">
                        Corporate Email
                      </span>
                      <p className="font-bold text-primary truncate">
                        {userDetails.email}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase">
                        Phone Number
                      </span>
                      <p className="font-bold text-primary">
                        {userDetails.phone_number || "Not provided"}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase">
                        Gender
                      </span>
                      <p className="font-bold text-primary">
                        {userDetails.gender || "Not specified"}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase">
                        Department
                      </span>
                      <p className="font-bold text-primary">
                        {userDetails.department || "Corporate Risk"}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase">
                        Registration Date
                      </span>
                      <p className="font-bold text-primary">
                        {new Date(userDetails.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Grid 2: Assigned Business Information */}
                {userDetails.organization_name && (
                  <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant space-y-3">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-primary">
                      <Building className="w-4 h-4 text-secondary" />
                      <span>Enterprise Business Profile</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-on-surface-variant uppercase">
                          Legal Organization Name
                        </span>
                        <p className="font-extrabold text-primary">
                          {userDetails.organization_name}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-on-surface-variant uppercase">
                          Industry Sector
                        </span>
                        <p className="font-bold text-primary">
                          {userDetails.organization_industry ||
                            "Financial & Enterprise"}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-on-surface-variant uppercase">
                          Type of Business
                        </span>
                        <p className="font-bold text-primary">
                          {userDetails.organization_business_type ||
                            "Microfinance / SME"}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-on-surface-variant uppercase">
                          Location
                        </span>
                        <p className="font-bold text-primary">
                          {[
                            userDetails.organization_district,
                            userDetails.organization_sector,
                            userDetails.organization_street_number,
                          ]
                            .filter(Boolean)
                            .join(", ") || "Kigali, Rwanda"}
                        </p>
                      </div>

                      {userDetails.organization_product_types && (
                        <div className="sm:col-span-2">
                          <span className="text-[10px] font-bold text-on-surface-variant uppercase">
                            Products & Services
                          </span>
                          <p className="font-semibold text-primary">
                            {userDetails.organization_product_types}
                          </p>
                        </div>
                      )}

                      {userDetails.organization_description && (
                        <div className="sm:col-span-2">
                          <span className="text-[10px] font-bold text-on-surface-variant uppercase">
                            Operational Scope
                          </span>
                          <p className="font-medium text-on-surface text-[11px] leading-relaxed">
                            {userDetails.organization_description}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Grid 3: Activity & Assessment Statistics */}
                <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-primary">
                    <Activity className="w-4 h-4 text-secondary" />
                    <span>Operational Activity & Audits</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center">
                    <div className="p-3 bg-surface-container-lowest rounded-xl border border-outline-variant">
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase">
                        Total Assessments
                      </span>
                      <p className="text-lg font-black text-primary mt-0.5">
                        {userDetails.stats?.total_assessments || 0}
                      </p>
                    </div>

                    <div className="p-3 bg-surface-container-lowest rounded-xl border border-outline-variant">
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase">
                        Completed ERI
                      </span>
                      <p className="text-lg font-black text-on-tertiary-container mt-0.5">
                        {userDetails.stats?.completed_assessments || 0}
                      </p>
                    </div>

                    <div className="p-3 bg-surface-container-lowest rounded-xl border border-outline-variant col-span-2 sm:col-span-1">
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase">
                        Latest Activity
                      </span>
                      <p className="text-xs font-bold text-primary mt-1 truncate">
                        {userDetails.stats?.latest_assessment_date
                          ? new Date(
                              userDetails.stats.latest_assessment_date,
                            ).toLocaleDateString()
                          : "No assessments"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="pt-3 border-t border-outline-variant flex justify-end">
              <button
                onClick={handleCloseDetails}
                className="px-5 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-bold text-primary cursor-pointer transition-all"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROVISION USER MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start">
              <h3 className="text-base font-bold text-primary">
                Provision New User Account
              </h3>
              <button
                onClick={resetForm}
                className="text-primary hover:text-error text-lg cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleCreateUser}
              noValidate
              className="space-y-4 text-xs"
            >
              {/* Full Name */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-primary uppercase tracking-wider">
                    Full Name <span className="text-secondary">*</span>
                  </label>
                  {nameError && (
                    <span className="text-[10px] font-bold text-red-500">
                      Invalid
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold focus:outline-none transition-all ${
                    nameError
                      ? "border-2 border-red-500 bg-red-500/10 text-red-700 placeholder:text-red-300 focus:ring-2 focus:ring-red-400"
                      : "bg-surface-container-low border border-outline-variant text-primary focus:ring-2 focus:ring-primary"
                  }`}
                  placeholder="e.g. Jean Damascene"
                />
                {nameError && (
                  <div className="mt-1.5 p-2 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-1.5 text-[11px] font-bold text-red-600 animate-in fade-in">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-600" />
                    <span>{nameError}</span>
                  </div>
                )}
              </div>

              {/* Corporate Email */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-primary uppercase tracking-wider">
                    Corporate Email <span className="text-secondary">*</span>
                  </label>
                  {emailError && (
                    <span className="text-[10px] font-bold text-red-500">
                      Invalid
                    </span>
                  )}
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold focus:outline-none transition-all ${
                    emailError
                      ? "border-2 border-red-500 bg-red-500/10 text-red-700 placeholder:text-red-300 focus:ring-2 focus:ring-red-400"
                      : "bg-surface-container-low border border-outline-variant text-primary focus:ring-2 focus:ring-primary"
                  }`}
                  placeholder="e.g. jean@enterprise.rw"
                />
                {emailError && (
                  <div className="mt-1.5 p-2 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-1.5 text-[11px] font-bold text-red-600 animate-in fade-in">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-600" />
                    <span>{emailError}</span>
                  </div>
                )}
              </div>

              {/* Phone & Gender */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-primary uppercase tracking-wider">
                      Phone Number
                    </label>
                    {phoneError && (
                      <span className="text-[10px] font-bold text-red-500">
                        Invalid
                      </span>
                    )}
                  </div>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold focus:outline-none transition-all ${
                      phoneError
                        ? "border-2 border-red-500 bg-red-500/10 text-red-700 placeholder:text-red-300 focus:ring-2 focus:ring-red-400"
                        : "bg-surface-container-low border border-outline-variant text-primary focus:ring-2 focus:ring-primary"
                    }`}
                    placeholder="+250 788 000 000"
                  />
                  {phoneError && (
                    <div className="mt-1.5 p-2 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-1.5 text-[11px] font-bold text-red-600 animate-in fade-in">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-600" />
                      <span>{phoneError}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-primary mb-1 uppercase tracking-wider">
                    Gender
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-primary uppercase tracking-wider">
                    Initial Password <span className="text-secondary">*</span>
                  </label>
                  {passwordError && (
                    <span className="text-[10px] font-bold text-red-500">
                      Invalid
                    </span>
                  )}
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold focus:outline-none transition-all ${
                    passwordError
                      ? "border-2 border-red-500 bg-red-500/10 text-red-700 placeholder:text-red-300 focus:ring-2 focus:ring-red-400"
                      : "bg-surface-container-low border border-outline-variant text-primary focus:ring-2 focus:ring-primary"
                  }`}
                />
                {passwordError && (
                  <p className="text-[10px] text-red-500 font-bold mt-1">
                    {passwordError}
                  </p>
                )}
              </div>

              {/* Role & Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-primary mb-1 uppercase tracking-wider">
                    System Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="RISK_OFFICER">Risk Officer</option>
                    <option value="EMPLOYEE">Employee</option>
                    <option value="SYSTEM_ADMIN">System Administrator</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-primary uppercase tracking-wider">
                      Department
                    </label>
                    {departmentError && (
                      <span className="text-[10px] font-bold text-red-500">
                        Invalid
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    value={department}
                    onChange={(e) => handleDepartmentChange(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold focus:outline-none transition-all ${
                      departmentError
                        ? "border-2 border-red-500 bg-red-500/10 text-red-700 placeholder:text-red-300 focus:ring-2 focus:ring-red-400"
                        : "bg-surface-container-low border border-outline-variant text-primary focus:ring-2 focus:ring-primary"
                    }`}
                    placeholder="e.g. Credit Risk Operations"
                  />
                  {departmentError && (
                    <p className="text-[10px] text-red-500 font-bold mt-1">
                      {departmentError}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-bold text-primary cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    saving ||
                    Boolean(
                      nameError ||
                        emailError ||
                        phoneError ||
                        passwordError ||
                        departmentError,
                    )
                  }
                  className="px-5 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 disabled:opacity-50 transition-all cursor-pointer shadow-sm"
                >
                  {saving ? "Provisioning..." : "Provision User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
