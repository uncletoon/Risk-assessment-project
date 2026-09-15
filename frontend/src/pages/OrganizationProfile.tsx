import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import {
  validateFullName,
  validateEmail,
  validatePhoneNumber,
  validateOrgName,
  validateLocationName,
  validateBusinessCategory,
  validateRequired,
} from "../lib/validation";
import {
  Building2,
  Save,
  CheckCircle2,
  AlertCircle,
  User,
  Mail,
  Phone,
  UserCheck,
  MapPin,
  Briefcase,
  Package,
  ShieldAlert,
  Users,
  FileText,
  Clock,
  XCircle,
  Eye,
  Download,
  PlusCircle,
  Check,
  X,
  Send,
  Building,
} from "lucide-react";

export default function OrganizationProfile() {
  const { user, updateCurrentUser, isSystemAdmin, isRiskOfficer, isEmployee } =
    useAuth();
  const navigate = useNavigate();
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Active Tab for Risk Officers: 'PROFILE', 'EMPLOYEES', 'SUBMISSIONS'
  const [activeTab, setActiveTab] = useState<
    "PROFILE" | "EMPLOYEES" | "SUBMISSIONS"
  >("PROFILE");

  // User Information Form State
  const [fullName, setFullName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [gender, setGender] = useState("Male");

  // User Errors State
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [savingUser, setSavingUser] = useState(false);
  const [userSuccessMsg, setUserSuccessMsg] = useState<string | null>(null);

  // Organization Form State (Risk Officers / Enterprise Users only)
  const [orgName, setOrgName] = useState("");
  const [industry, setIndustry] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [district, setDistrict] = useState("");
  const [sector, setSector] = useState("");
  const [streetNumber, setStreetNumber] = useState("");
  const [productTypes, setProductTypes] = useState("");
  const [description, setDescription] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  // Org Errors State
  const [orgNameError, setOrgNameError] = useState<string | null>(null);
  const [industryError, setIndustryError] = useState<string | null>(null);
  const [businessTypeError, setBusinessTypeError] = useState<string | null>(
    null,
  );
  const [districtError, setDistrictError] = useState<string | null>(null);
  const [sectorError, setSectorError] = useState<string | null>(null);
  const [contactEmailError, setContactEmailError] = useState<string | null>(
    null,
  );
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [savingOrg, setSavingOrg] = useState(false);
  const [orgSuccessMsg, setOrgSuccessMsg] = useState<string | null>(null);

  // Employees & Submissions State (Risk Officer)
  const [employees, setEmployees] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [loadingEmpDetails, setLoadingEmpDetails] = useState(false);
  const [empActionLoadingId, setEmpActionLoadingId] = useState<number | null>(
    null,
  );
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, [user, isSystemAdmin]);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      if (user) {
        setFullName(user.full_name || "");
        setUserEmail(user.email || "");
        setPhoneNumber(user.phone_number || "");
        setGender(user.gender || "Male");
      }

      // Only load organization details if the user is NOT a system admin
      if (!isSystemAdmin) {
        const orgs = await api.getOrganizations();
        if (orgs.length > 0) {
          const currentOrg =
            orgs.find((o) => o.id === user?.organization_id) || orgs[0];
          setOrg(currentOrg);
          setOrgName(currentOrg.name || "");
          setIndustry(currentOrg.industry || "Financial & Enterprise Services");
          setBusinessType(
            currentOrg.business_type || "Microfinance & Digital Lending",
          );
          setDistrict(currentOrg.district || "Nyarugenge");
          setSector(currentOrg.sector || "Nyarugenge");
          setStreetNumber(currentOrg.street_number || "");
          setProductTypes(currentOrg.product_types || "");
          setDescription(currentOrg.description || "");
          setContactEmail(currentOrg.contact_email || "");
        }

        // Fetch organization employees & document submissions for Risk Officers
        if (
          isRiskOfficer ||
          user?.role === "RISK_OFFICER" ||
          user?.role === "risk_officer"
        ) {
          fetchOrgEmployees();
          fetchOrgSubmissions();
        }
      }
    } catch (err) {
      console.error("Failed to load profile details:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrgEmployees = async () => {
    try {
      setLoadingEmployees(true);
      const list = await api.getOrganizationEmployees();
      setEmployees(list || []);
    } catch (err) {
      console.error("Failed to load employees:", err);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const fetchOrgSubmissions = async () => {
    try {
      setLoadingSubmissions(true);
      const list = await api.getOrganizationSubmissions();
      setSubmissions(list || []);
    } catch (err) {
      console.error("Failed to load submissions:", err);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleUpdateEmployeeStatus = async (
    employeeId: number,
    newStatus: "accept" | "decline" | "enable" | "disable",
  ) => {
    setEmpActionLoadingId(employeeId);
    try {
      const res = await api.updateEmployeeStatus(employeeId, newStatus);
      showNotification("success", res.message || "Employee status updated.");
      await fetchOrgEmployees();
      if (selectedEmployee && selectedEmployee.id === employeeId) {
        setSelectedEmployee((prev: any) => ({
          ...prev,
          status: res.employee.status,
        }));
      }
    } catch (err: any) {
      showNotification(
        "error",
        err.message || "Failed to update employee status.",
      );
    } finally {
      setEmpActionLoadingId(null);
    }
  };

  const handleViewEmployeeDetails = async (employeeId: number) => {
    setLoadingEmpDetails(true);
    try {
      const data = await api.getEmployeeDetails(employeeId);
      setSelectedEmployee(data);
    } catch (err: any) {
      showNotification(
        "error",
        err.message || "Failed to load employee details.",
      );
    } finally {
      setLoadingEmpDetails(false);
    }
  };

  const handleDownloadSubmission = async (
    submissionId: number,
    documentName?: string,
  ) => {
    try {
      await api.downloadSubmission(submissionId, documentName);
    } catch (err: any) {
      showNotification("error", err.message || "Failed to download document.");
    }
  };

  // User Profile Form Handlers
  const handleNameChange = (val: string) => {
    setFullName(val);
    const res = validateFullName(val);
    setNameError(res.error);
  };

  const handleEmailChange = (val: string) => {
    setUserEmail(val);
    const res = validateEmail(val, true);
    setEmailError(res.error);
  };

  const handlePhoneChange = (val: string) => {
    setPhoneNumber(val);
    const res = validatePhoneNumber(val);
    setPhoneError(res.error);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserSuccessMsg(null);

    const nameRes = validateFullName(fullName);
    const emailRes = validateEmail(userEmail, true);
    const phoneRes = validatePhoneNumber(phoneNumber);

    setNameError(nameRes.error);
    setEmailError(emailRes.error);
    setPhoneError(phoneRes.error);

    if (!nameRes.isValid || !emailRes.isValid || !phoneRes.isValid) {
      return;
    }

    setSavingUser(true);
    try {
      const updated = await api.updateUserProfile({
        full_name: fullName,
        email: userEmail,
        phone_number: phoneNumber,
        gender,
      });

      updateCurrentUser({
        full_name: updated.full_name,
        email: updated.email,
        phone_number: updated.phone_number,
        gender: updated.gender,
      });

      setUserSuccessMsg("User information updated successfully.");
      setTimeout(() => setUserSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error("Failed to update user profile:", err);
      showNotification(
        "error",
        err.message || "Failed to update user information.",
      );
    } finally {
      setSavingUser(false);
    }
  };

  // Organization Form Handlers
  const handleOrgNameChange = (val: string) => {
    setOrgName(val);
    const res = validateOrgName(val);
    setOrgNameError(res.error);
  };

  const handleIndustryChange = (val: string) => {
    setIndustry(val);
    const res = validateRequired(val, "Industry Sector", 3);
    setIndustryError(res.error);
  };

  const handleBusinessTypeChange = (val: string) => {
    setBusinessType(val);
    const res = validateBusinessCategory(val);
    setBusinessTypeError(res.error);
  };

  const handleDistrictChange = (val: string) => {
    setDistrict(val);
    const res = validateLocationName(val, "District");
    setDistrictError(res.error);
  };

  const handleSectorChange = (val: string) => {
    setSector(val);
    const res = validateLocationName(val, "Sector");
    setSectorError(res.error);
  };

  const handleContactEmailChange = (val: string) => {
    setContactEmail(val);
    if (val.trim()) {
      const res = validateEmail(val, true);
      setContactEmailError(res.error);
    } else {
      setContactEmailError(null);
    }
  };

  const handleDescriptionChange = (val: string) => {
    setDescription(val);
    if (val.trim() && val.trim().length < 10) {
      setDescriptionError(
        "Description must be at least 10 characters if provided.",
      );
    } else {
      setDescriptionError(null);
    }
  };

  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org) return;

    setOrgSuccessMsg(null);

    const orgRes = validateOrgName(orgName);
    const indRes = validateRequired(industry, "Industry Sector", 3);
    const typeRes = validateBusinessCategory(businessType);
    const distRes = validateLocationName(district, "District");
    const secRes = validateLocationName(sector, "Sector");

    let contactEmailErr = null;
    if (contactEmail.trim()) {
      const emailVal = validateEmail(contactEmail, true);
      contactEmailErr = emailVal.error;
    }

    let descErr = null;
    if (description.trim() && description.trim().length < 10) {
      descErr = "Description must be at least 10 characters.";
    }

    setOrgNameError(orgRes.error);
    setIndustryError(indRes.error);
    setBusinessTypeError(typeRes.error);
    setDistrictError(distRes.error);
    setSectorError(secRes.error);
    setContactEmailError(contactEmailErr);
    setDescriptionError(descErr);

    if (
      !orgRes.isValid ||
      !indRes.isValid ||
      !typeRes.isValid ||
      !distRes.isValid ||
      !secRes.isValid ||
      contactEmailErr ||
      descErr
    ) {
      return;
    }

    setSavingOrg(true);
    try {
      const updated = await api.updateOrganization(org.id, {
        name: orgName,
        industry,
        business_type: businessType,
        district,
        sector,
        street_number: streetNumber,
        product_types: productTypes,
        description,
        contact_email: contactEmail,
      });

      setOrg(updated);
      setOrgSuccessMsg("Enterprise profile updated successfully.");
      setTimeout(() => setOrgSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error("Failed to update organization:", err);
      showNotification(
        "error",
        err.message || "Failed to update organization profile.",
      );
    } finally {
      setSavingOrg(false);
    }
  };

  const pendingEmployeesCount = employees.filter(
    (e) => e.status === "pending",
  ).length;

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
      <div className="bg-surface-container-lowest p-5 sm:p-6 rounded-2xl border border-outline-variant shadow-xs">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Building className="w-4 h-4 text-primary" />
              <span className="text-xs font-extrabold uppercase tracking-wider text-primary">
                {isSystemAdmin
                  ? "System Administration"
                  : orgName || "Enterprise Profile"}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-primary tracking-tight">
              {isSystemAdmin
                ? "Administrator Profile"
                : isEmployee
                  ? "My Profile & Business Details"
                  : "Business & Employee Governance"}
            </h1>
            <p className="text-xs sm:text-sm text-on-surface-variant font-medium mt-0.5">
              {isSystemAdmin
                ? "Manage your administrator account credentials."
                : isEmployee
                  ? "Manage your personal user information and inspect your assigned enterprise organization details."
                  : "Configure enterprise metadata, manage employee accounts, and review document submissions."}
            </p>
          </div>

          {/* Sub-Navigation Tabs for Risk Officers Only */}
          {!isSystemAdmin && !isEmployee && (
            <div className="flex items-center gap-1.5 p-1 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-bold shrink-0">
              <button
                onClick={() => setActiveTab("PROFILE")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === "PROFILE"
                    ? "bg-surface-container-lowest text-primary shadow-xs border border-outline-variant font-black"
                    : "text-on-surface-variant hover:text-primary"
                }`}
              >
                Business Info
              </button>

              <button
                onClick={() => setActiveTab("EMPLOYEES")}
                className={`relative px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "EMPLOYEES"
                    ? "bg-surface-container-lowest text-primary shadow-xs border border-outline-variant font-black"
                    : "text-on-surface-variant hover:text-primary"
                }`}
              >
                <Users className="w-3.5 h-3.5 text-secondary" />
                <span>Employees</span>
                {pendingEmployeesCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-500 text-white animate-pulse">
                    {pendingEmployeesCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab("SUBMISSIONS")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "SUBMISSIONS"
                    ? "bg-surface-container-lowest text-primary shadow-xs border border-outline-variant font-black"
                    : "text-on-surface-variant hover:text-primary"
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-primary" />
                <span>Submissions</span>
                {submissions.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-primary/10 text-primary">
                    {submissions.length}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: BUSINESS & OFFICER PROFILE INFO */}
      {/* ==================================================================== */}
      {(activeTab === "PROFILE" || isSystemAdmin) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* USER INFORMATION CARD */}
          <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-black text-primary uppercase tracking-wide">
                  User Information
                </h3>
              </div>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                {user?.role}
              </span>
            </div>

            {userSuccessMsg && (
              <div className="p-3 rounded-xl bg-tertiary-container/30 border border-tertiary-fixed-dim/60 flex items-center gap-2 text-xs font-bold text-on-tertiary-container">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-on-tertiary-container" />
                <span>{userSuccessMsg}</span>
              </div>
            )}

            <form
              onSubmit={handleSaveUser}
              noValidate
              className="space-y-3.5 text-xs"
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
                  <p className="text-[11px] font-bold text-red-600 mt-1">
                    {nameError}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-primary uppercase tracking-wider">
                    Email Address <span className="text-secondary">*</span>
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
                  value={userEmail}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold focus:outline-none transition-all ${
                    emailError
                      ? "border-2 border-red-500 bg-red-500/10 text-red-700 placeholder:text-red-300 focus:ring-2 focus:ring-red-400"
                      : "bg-surface-container-low border border-outline-variant text-primary focus:ring-2 focus:ring-primary"
                  }`}
                />
                {emailError && (
                  <p className="text-[11px] font-bold text-red-600 mt-1">
                    {emailError}
                  </p>
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
                    <p className="text-[11px] font-bold text-red-600 mt-1">
                      {phoneError}
                    </p>
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

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingUser}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                >
                  <Save className="w-4 h-4 text-secondary" />
                  <span>{savingUser ? "Saving..." : "Save User Info"}</span>
                </button>
              </div>
            </form>
          </div>

          {/* ENTERPRISE ORGANIZATION PROFILE CARD */}
          {!isSystemAdmin && (
            <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-secondary" />
                  <h3 className="text-sm font-black text-primary uppercase tracking-wide">
                    Enterprise Organization Profile
                  </h3>
                </div>
              </div>

              {orgSuccessMsg && (
                <div className="p-3 rounded-xl bg-tertiary-container/30 border border-tertiary-fixed-dim/60 flex items-center gap-2 text-xs font-bold text-on-tertiary-container">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-on-tertiary-container" />
                  <span>{orgSuccessMsg}</span>
                </div>
              )}

              <form
                onSubmit={handleSaveOrg}
                noValidate
                className="space-y-3.5 text-xs"
              >
                {/* Organization Name */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-primary uppercase tracking-wider">
                      Organization Name{" "}
                      {!isEmployee && <span className="text-secondary">*</span>}
                    </label>
                    {!isEmployee && orgNameError && (
                      <span className="text-[10px] font-bold text-red-500">
                        Invalid
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    required={!isEmployee}
                    disabled={isEmployee}
                    value={orgName}
                    onChange={(e) => handleOrgNameChange(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold focus:outline-none transition-all ${
                      isEmployee
                        ? "bg-surface-container-high/30 text-on-surface border border-outline-variant/60 cursor-not-allowed opacity-90"
                        : orgNameError
                          ? "border-2 border-red-500 bg-red-500/10 text-red-700 placeholder:text-red-300 focus:ring-2 focus:ring-red-400"
                          : "bg-surface-container-low border border-outline-variant text-primary focus:ring-2 focus:ring-primary"
                    }`}
                  />
                  {!isEmployee && orgNameError && (
                    <p className="text-[11px] font-bold text-red-600 mt-1">
                      {orgNameError}
                    </p>
                  )}
                </div>

                {/* Industry & Business Type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-bold text-primary uppercase tracking-wider">
                        Industry Sector{" "}
                        {!isEmployee && (
                          <span className="text-secondary">*</span>
                        )}
                      </label>
                      {!isEmployee && industryError && (
                        <span className="text-[10px] font-bold text-red-500">
                          Invalid
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      required={!isEmployee}
                      disabled={isEmployee}
                      value={industry}
                      onChange={(e) => handleIndustryChange(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold focus:outline-none transition-all ${
                        isEmployee
                          ? "bg-surface-container-high/30 text-on-surface border border-outline-variant/60 cursor-not-allowed opacity-90"
                          : industryError
                            ? "border-2 border-red-500 bg-red-500/10 text-red-700 placeholder:text-red-300 focus:ring-2 focus:ring-red-400"
                            : "bg-surface-container-low border border-outline-variant text-primary focus:ring-2 focus:ring-primary"
                      }`}
                    />
                    {!isEmployee && industryError && (
                      <p className="text-[11px] font-bold text-red-600 mt-1">
                        {industryError}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-bold text-primary uppercase tracking-wider">
                        Business Type{" "}
                        {!isEmployee && (
                          <span className="text-secondary">*</span>
                        )}
                      </label>
                      {!isEmployee && businessTypeError && (
                        <span className="text-[10px] font-bold text-red-500">
                          Invalid
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      required={!isEmployee}
                      disabled={isEmployee}
                      value={businessType}
                      onChange={(e) => handleBusinessTypeChange(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold focus:outline-none transition-all ${
                        isEmployee
                          ? "bg-surface-container-high/30 text-on-surface border border-outline-variant/60 cursor-not-allowed opacity-90"
                          : businessTypeError
                            ? "border-2 border-red-500 bg-red-500/10 text-red-700 placeholder:text-red-300 focus:ring-2 focus:ring-red-400"
                            : "bg-surface-container-low border border-outline-variant text-primary focus:ring-2 focus:ring-primary"
                      }`}
                    />
                    {!isEmployee && businessTypeError && (
                      <p className="text-[11px] font-bold text-red-600 mt-1">
                        {businessTypeError}
                      </p>
                    )}
                  </div>
                </div>

                {/* Location: District, Sector, Street */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-bold text-primary uppercase tracking-wider">
                        District{" "}
                        {!isEmployee && (
                          <span className="text-secondary">*</span>
                        )}
                      </label>
                      {!isEmployee && districtError && (
                        <span className="text-[10px] font-bold text-red-500">
                          Invalid
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      required={!isEmployee}
                      disabled={isEmployee}
                      value={district}
                      onChange={(e) => handleDistrictChange(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold focus:outline-none transition-all ${
                        isEmployee
                          ? "bg-surface-container-high/30 text-on-surface border border-outline-variant/60 cursor-not-allowed opacity-90"
                          : districtError
                            ? "border-2 border-red-500 bg-red-500/10 text-red-700 placeholder:text-red-300 focus:ring-2 focus:ring-red-400"
                            : "bg-surface-container-low border border-outline-variant text-primary focus:ring-2 focus:ring-primary"
                      }`}
                    />
                    {!isEmployee && districtError && (
                      <p className="text-[11px] font-bold text-red-600 mt-1">
                        {districtError}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-bold text-primary uppercase tracking-wider">
                        Sector{" "}
                        {!isEmployee && (
                          <span className="text-secondary">*</span>
                        )}
                      </label>
                      {!isEmployee && sectorError && (
                        <span className="text-[10px] font-bold text-red-500">
                          Invalid
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      required={!isEmployee}
                      disabled={isEmployee}
                      value={sector}
                      onChange={(e) => handleSectorChange(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold focus:outline-none transition-all ${
                        isEmployee
                          ? "bg-surface-container-high/30 text-on-surface border border-outline-variant/60 cursor-not-allowed opacity-90"
                          : sectorError
                            ? "border-2 border-red-500 bg-red-500/10 text-red-700 placeholder:text-red-300 focus:ring-2 focus:ring-red-400"
                            : "bg-surface-container-low border border-outline-variant text-primary focus:ring-2 focus:ring-primary"
                      }`}
                    />
                    {!isEmployee && sectorError && (
                      <p className="text-[11px] font-bold text-red-600 mt-1">
                        {sectorError}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block font-bold text-primary mb-1 uppercase tracking-wider">
                      Street / Plot
                    </label>
                    <input
                      type="text"
                      disabled={isEmployee}
                      value={streetNumber}
                      onChange={(e) => setStreetNumber(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold focus:outline-none transition-all ${
                        isEmployee
                          ? "bg-surface-container-high/30 text-on-surface border border-outline-variant/60 cursor-not-allowed opacity-90"
                          : "bg-surface-container-low border border-outline-variant text-primary focus:ring-2 focus:ring-primary"
                      }`}
                      placeholder="KN 45 St"
                    />
                  </div>
                </div>

                {/* Products & Description */}
                <div>
                  <label className="block font-bold text-primary mb-1 uppercase tracking-wider">
                    Products & Services
                  </label>
                  <input
                    type="text"
                    disabled={isEmployee}
                    value={productTypes}
                    onChange={(e) => setProductTypes(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold focus:outline-none transition-all ${
                      isEmployee
                        ? "bg-surface-container-high/30 text-on-surface border border-outline-variant/60 cursor-not-allowed opacity-90"
                        : "bg-surface-container-low border border-outline-variant text-primary focus:ring-2 focus:ring-primary"
                    }`}
                  />
                </div>

                {!isEmployee && (
                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={savingOrg}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                    >
                      <Save className="w-4 h-4 text-secondary" />
                      <span>
                        {savingOrg ? "Saving..." : "Save Enterprise Profile"}
                      </span>
                    </button>
                  </div>
                )}
              </form>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: ENTERPRISE EMPLOYEES & APPROVAL WORKFLOW */}
      {/* ==================================================================== */}
      {activeTab === "EMPLOYEES" && !isSystemAdmin && (
        <div className="space-y-4">
          {/* Pending Requests Notification Banner */}
          {pendingEmployeesCount > 0 && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center font-black">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-amber-700">
                    {pendingEmployeesCount} Pending Employee Access Request(s)
                  </h4>
                  <p className="text-[11px] text-amber-600 font-medium">
                    Review and accept or decline employee registration requests
                    to allow them to submit business documents.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Employees Table */}
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-xs overflow-hidden">
            <div className="p-5 border-b border-outline-variant flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-secondary" />
                <h3 className="text-sm font-black text-primary">
                  Registered Enterprise Employees
                </h3>
              </div>
              <span className="text-xs font-bold text-on-surface-variant">
                {employees.length} Employees
              </span>
            </div>

            {loadingEmployees ? (
              <div className="flex flex-col items-center justify-center p-12 text-primary">
                <div className="w-8 h-8 border-3 border-secondary border-t-transparent rounded-full animate-spin mb-3"></div>
                <p className="text-xs font-bold">Loading employee list...</p>
              </div>
            ) : employees.length === 0 ? (
              <div className="p-12 text-center text-on-surface-variant">
                <Users className="w-10 h-10 mx-auto text-secondary mb-2 opacity-50" />
                <p className="text-sm font-bold text-primary">
                  No employees registered under this business yet.
                </p>
                <p className="text-xs font-medium mt-1">
                  Employees can register on the registration page by selecting "
                  {orgName || "your organization"}".
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-outline-variant bg-surface-container-low text-[11px] font-black uppercase tracking-wider text-primary">
                      <th className="py-3 px-5">Employee</th>
                      <th className="py-3 px-4">Contact Info</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4">Submissions</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {employees.map((emp) => {
                      const isPending = emp.status === "pending";
                      const isActive = emp.status === "active";
                      const isRejected = emp.status === "rejected";

                      return (
                        <tr
                          key={emp.id}
                          className="hover:bg-surface-container-low/60 transition-colors"
                        >
                          {/* Name & Avatar */}
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs shrink-0">
                                {emp.full_name
                                  ? emp.full_name
                                      .split(" ")
                                      .map((n: string) => n[0])
                                      .slice(0, 2)
                                      .join("")
                                      .toUpperCase()
                                  : "E"}
                              </div>
                              <div>
                                <p className="font-extrabold text-primary">
                                  {emp.full_name}
                                </p>
                                <p className="text-[11px] text-on-surface-variant truncate max-w-[170px]">
                                  {emp.email}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Contact Info */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-0.5 text-[11px]">
                              <p className="font-semibold text-primary">
                                {emp.phone_number || "No phone"}
                              </p>
                              <p className="text-[10px] text-on-surface-variant">
                                Gender: {emp.gender || "N/A"}
                              </p>
                            </div>
                          </td>

                          {/* Department */}
                          <td className="py-3.5 px-4 font-bold text-primary text-[11px]">
                            {emp.department || "Operations"}
                          </td>

                          {/* Submissions Count */}
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded text-[11px] font-black bg-surface-container text-primary border border-outline-variant">
                              {emp.submission_count || 0} files
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black border ${
                                isPending
                                  ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                                  : isActive
                                    ? "bg-tertiary-container/30 text-on-tertiary-container border-tertiary-fixed-dim/60"
                                    : "bg-error-container/60 text-on-error-container border-error/50"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isPending
                                    ? "bg-amber-500 animate-pulse"
                                    : isActive
                                      ? "bg-on-tertiary-container"
                                      : "bg-on-error-container"
                                }`}
                              />
                              <span>
                                {isPending
                                  ? "PENDING APPROVAL"
                                  : isActive
                                    ? "ACTIVE"
                                    : isRejected
                                      ? "DECLINED"
                                      : "DEACTIVATED"}
                              </span>
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isPending ? (
                                <>
                                  <button
                                    onClick={() =>
                                      handleUpdateEmployeeStatus(
                                        emp.id,
                                        "accept",
                                      )
                                    }
                                    disabled={empActionLoadingId === emp.id}
                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-tertiary-container text-on-tertiary-container hover:bg-tertiary-container/80 text-[11px] font-black transition-all cursor-pointer border border-tertiary-fixed-dim"
                                    title="Accept employee request"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Accept</span>
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleUpdateEmployeeStatus(
                                        emp.id,
                                        "decline",
                                      )
                                    }
                                    disabled={empActionLoadingId === emp.id}
                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-error-container text-on-error-container hover:bg-error-container/80 text-[11px] font-black transition-all cursor-pointer border border-error/40"
                                    title="Decline employee request"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    <span>Decline</span>
                                  </button>
                                </>
                              ) : isActive ? (
                                <button
                                  onClick={() =>
                                    handleUpdateEmployeeStatus(
                                      emp.id,
                                      "disable",
                                    )
                                  }
                                  disabled={empActionLoadingId === emp.id}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-error/10 hover:bg-error/20 text-error text-[11px] font-bold transition-all cursor-pointer border border-error/30"
                                  title="Disable employee access"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Disable</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() =>
                                    handleUpdateEmployeeStatus(emp.id, "enable")
                                  }
                                  disabled={empActionLoadingId === emp.id}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-tertiary-container/30 hover:bg-tertiary-container text-on-tertiary-container text-[11px] font-bold transition-all cursor-pointer border border-tertiary-fixed-dim/60"
                                  title="Enable employee access"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Enable</span>
                                </button>
                              )}

                              {/* Details button */}
                              <button
                                onClick={() =>
                                  handleViewEmployeeDetails(emp.id)
                                }
                                className="p-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant text-primary font-bold transition-all cursor-pointer"
                                title="View complete employee details"
                              >
                                <Eye className="w-3.5 h-3.5 text-secondary" />
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
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: EMPLOYEE DOCUMENT SUBMISSIONS */}
      {/* ==================================================================== */}
      {activeTab === "SUBMISSIONS" && !isSystemAdmin && (
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-xs overflow-hidden">
          <div className="p-5 border-b border-outline-variant flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-black text-primary">
                Employee Document Submissions for Risk Assessment
              </h3>
            </div>
            <span className="text-xs font-bold text-on-surface-variant">
              {submissions.length} Total Documents
            </span>
          </div>

          {loadingSubmissions ? (
            <div className="flex flex-col items-center justify-center p-12 text-primary">
              <div className="w-8 h-8 border-3 border-secondary border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-xs font-bold">Loading submissions...</p>
            </div>
          ) : submissions.length === 0 ? (
            <div className="p-12 text-center text-on-surface-variant">
              <FileText className="w-10 h-10 mx-auto text-secondary mb-2 opacity-50" />
              <p className="text-sm font-bold text-primary">
                No employee documents submitted yet.
              </p>
              <p className="text-xs font-medium mt-1">
                When employees upload operational or financial documents, they
                will appear here ready for risk assessment.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container-low text-[11px] font-black uppercase tracking-wider text-primary">
                    <th className="py-3 px-5">Document Title & File</th>
                    <th className="py-3 px-4">Submitted By</th>
                    <th className="py-3 px-4">Operational Notes</th>
                    <th className="py-3 px-4">Submission Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {submissions.map((s) => (
                    <tr
                      key={s.id}
                      className="hover:bg-surface-container-low/60 transition-colors"
                    >
                      {/* Title & File */}
                      <td className="py-3.5 px-5">
                        <div className="space-y-0.5 max-w-[200px]">
                          <p
                            className="font-extrabold text-primary truncate"
                            title={s.title}
                          >
                            {s.title}
                          </p>
                          <div className="flex items-center gap-1.5 text-[11px] text-on-surface-variant truncate">
                            <FileText className="w-3 h-3 text-secondary shrink-0" />
                            <span className="truncate" title={s.document_name}>
                              {s.document_name}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Submitted By */}
                      <td className="py-3.5 px-4">
                        <div>
                          <p className="font-bold text-primary">
                            {s.employee_name}
                          </p>
                          <p className="text-[10px] text-on-surface-variant">
                            {s.employee_department || "Operations"}
                          </p>
                        </div>
                      </td>

                      {/* Notes */}
                      <td className="py-3.5 px-4">
                        <p className="text-[11px] text-on-surface line-clamp-2 max-w-[240px]">
                          {s.description || "No description provided"}
                        </p>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-[11px] font-medium text-on-surface-variant">
                        {new Date(s.created_at).toLocaleString()}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black border bg-secondary/15 text-secondary border-secondary/30">
                          {s.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() =>
                              handleDownloadSubmission(s.id, s.document_name)
                            }
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant text-primary text-[11px] font-bold transition-all cursor-pointer"
                            title="Download document file"
                          >
                            <Download className="w-3.5 h-3.5 text-secondary" />
                            <span>Download</span>
                          </button>

                          <button
                            onClick={() => navigate("/assessments/new")}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary text-on-primary text-[11px] font-bold hover:bg-primary/90 transition-all cursor-pointer shadow-xs"
                            title="Create new risk assessment using this document"
                          >
                            <PlusCircle className="w-3.5 h-3.5 text-secondary" />
                            <span>Assess Risk</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* EMPLOYEE DETAILS MODAL */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center font-black text-sm">
                  {selectedEmployee.full_name
                    ? selectedEmployee.full_name
                        .split(" ")
                        .map((n: string) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()
                    : "E"}
                </div>
                <div>
                  <h3 className="text-sm font-black text-primary">
                    {selectedEmployee.full_name}
                  </h3>
                  <p className="text-[11px] text-on-surface-variant font-semibold">
                    Employee ID #{selectedEmployee.id} •{" "}
                    {selectedEmployee.department || "Operations"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEmployee(null)}
                className="w-7 h-7 rounded-lg bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-primary font-bold text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Profile Info */}
            <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] font-bold text-on-surface-variant uppercase">
                  Email Address
                </span>
                <p className="font-bold text-primary truncate">
                  {selectedEmployee.email}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-on-surface-variant uppercase">
                  Phone Number
                </span>
                <p className="font-bold text-primary">
                  {selectedEmployee.phone_number || "Not provided"}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-on-surface-variant uppercase">
                  Gender
                </span>
                <p className="font-bold text-primary">
                  {selectedEmployee.gender || "Not specified"}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-on-surface-variant uppercase">
                  Status
                </span>
                <p className="font-bold text-primary uppercase">
                  {selectedEmployee.status}
                </p>
              </div>
            </div>

            {/* Submissions by this employee */}
            <div className="space-y-2 text-xs">
              <h4 className="font-black text-primary uppercase tracking-wide text-[11px]">
                Submitted Documents ({selectedEmployee.submissions?.length || 0}
                )
              </h4>
              {selectedEmployee.submissions &&
              selectedEmployee.submissions.length > 0 ? (
                <div className="space-y-2">
                  {selectedEmployee.submissions.map((sub: any) => (
                    <div
                      key={sub.id}
                      className="p-3 rounded-xl bg-surface-container-low border border-outline-variant flex items-center justify-between gap-3"
                    >
                      <div className="space-y-0.5">
                        <p className="font-bold text-primary text-xs">
                          {sub.title}
                        </p>
                        <p className="text-[11px] text-on-surface-variant">
                          {sub.document_name}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          handleDownloadSubmission(sub.id, sub.document_name)
                        }
                        className="p-2 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant text-primary cursor-pointer"
                        title="Download"
                      >
                        <Download className="w-3.5 h-3.5 text-secondary" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-on-surface-variant text-xs italic">
                  No documents submitted by this employee yet.
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-outline-variant flex justify-end">
              <button
                onClick={() => setSelectedEmployee(null)}
                className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-bold text-primary cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
