import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import {
  validateFullName,
  validateEmail,
  validatePhoneNumber,
  validatePassword,
  validateOrgName,
  validateLocationName,
  validateBusinessCategory,
  validateRequired,
} from "../lib/validation";
import {
  ShieldAlert,
  Building2,
  User,
  Mail,
  Phone,
  Lock,
  MapPin,
  Briefcase,
  Package,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Users,
  Clock,
} from "lucide-react";

export default function Register() {
  const { register, loading, error: authError } = useAuth();
  const navigate = useNavigate();

  // Role Type: 'RISK_OFFICER' or 'EMPLOYEE'
  const [accountType, setAccountType] = useState<"RISK_OFFICER" | "EMPLOYEE">("RISK_OFFICER");

  // Wizard Step for Risk Officer (1: Personal Account, 2: Business Profile)
  const [step, setStep] = useState<1 | 2>(1);

  // Common User Account Fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [gender, setGender] = useState("Male");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Employee-Specific Fields
  const [selectedOrgId, setSelectedOrgId] = useState<number | "">("");
  const [department, setDepartment] = useState("Operations");
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [employeeSuccessMessage, setEmployeeSuccessMessage] = useState<string | null>(null);

  // Step 1 / User Validation Errors
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [orgSelectError, setOrgSelectError] = useState<string | null>(null);
  const [deptError, setDeptError] = useState<string | null>(null);

  // Step 2: Risk Officer Enterprise Profile Fields
  const [orgName, setOrgName] = useState("");
  const [industry, setIndustry] = useState("Financial & Enterprise Services");
  const [businessType, setBusinessType] = useState("Microfinance & Digital Lending");
  const [district, setDistrict] = useState("Nyarugenge");
  const [sector, setSector] = useState("Nyarugenge");
  const [streetNumber, setStreetNumber] = useState("");
  const [productTypes, setProductTypes] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [description, setDescription] = useState("");

  // Step 2 Errors
  const [orgNameError, setOrgNameError] = useState<string | null>(null);
  const [industryError, setIndustryError] = useState<string | null>(null);
  const [businessTypeError, setBusinessTypeError] = useState<string | null>(null);
  const [districtError, setDistrictError] = useState<string | null>(null);
  const [sectorError, setSectorError] = useState<string | null>(null);
  const [contactEmailError, setContactEmailError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  // Fetch registered organizations for employee role selection
  useEffect(() => {
    fetchOrgs();
  }, []);

  const fetchOrgs = async () => {
    try {
      setLoadingOrgs(true);
      const list = await api.getPublicOrganizations();
      setOrganizations(list || []);
      if (list && list.length > 0 && !selectedOrgId) {
        setSelectedOrgId(list[0].id);
      }
    } catch (err) {
      console.error("Failed to load organizations:", err);
    } finally {
      setLoadingOrgs(false);
    }
  };

  // Live Validation Handlers
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

    if (confirmPassword && val !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match.");
    } else if (confirmPassword && val === confirmPassword) {
      setConfirmPasswordError(null);
    }
  };

  const handleConfirmPasswordChange = (val: string) => {
    setConfirmPassword(val);
    if (!val) {
      setConfirmPasswordError("Please confirm your password.");
    } else if (val !== password) {
      setConfirmPasswordError("Passwords do not match.");
    } else {
      setConfirmPasswordError(null);
    }
  };

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
      setDescriptionError("Description must be at least 10 characters if provided.");
    } else {
      setDescriptionError(null);
    }
  };

  // Next Step for Risk Officer (Account Details -> Enterprise Profile)
  const handleProceedToStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const nameRes = validateFullName(fullName);
    const emailRes = validateEmail(email, true);
    const phoneRes = validatePhoneNumber(phoneNumber);
    const passRes = validatePassword(password);

    let confirmErr = null;
    if (!confirmPassword) {
      confirmErr = "Please confirm your password.";
    } else if (password !== confirmPassword) {
      confirmErr = "Passwords do not match.";
    }

    setNameError(nameRes.error);
    setEmailError(emailRes.error);
    setPhoneError(phoneRes.error);
    setPasswordError(passRes.error);
    setConfirmPasswordError(confirmErr);

    if (!nameRes.isValid || !emailRes.isValid || !phoneRes.isValid || !passRes.isValid || confirmErr) {
      return;
    }

    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Submit Employee Registration
  const handleEmployeeRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const nameRes = validateFullName(fullName);
    const emailRes = validateEmail(email, true);
    const phoneRes = validatePhoneNumber(phoneNumber);
    const passRes = validatePassword(password);
    const deptRes = validateRequired(department, "Department", 2);

    let confirmErr = null;
    if (!confirmPassword) {
      confirmErr = "Please confirm your password.";
    } else if (password !== confirmPassword) {
      confirmErr = "Passwords do not match.";
    }

    let orgErr = null;
    if (!selectedOrgId) {
      orgErr = "Please select the business organization you belong to.";
    }

    setNameError(nameRes.error);
    setEmailError(emailRes.error);
    setPhoneError(phoneRes.error);
    setPasswordError(passRes.error);
    setConfirmPasswordError(confirmErr);
    setOrgSelectError(orgErr);
    setDeptError(deptRes.error);

    if (!nameRes.isValid || !emailRes.isValid || !phoneRes.isValid || !passRes.isValid || confirmErr || orgErr || !deptRes.isValid) {
      return;
    }

    const payload = {
      role: "EMPLOYEE",
      fullName,
      email,
      phoneNumber,
      gender,
      password,
      organizationId: selectedOrgId,
      department,
    };

    const res = await register(payload);
    if (res.success) {
      const orgObj = organizations.find((o) => o.id === Number(selectedOrgId));
      setEmployeeSuccessMessage(
        res.message ||
          `Registration submitted successfully! Your account is attached to ${
            orgObj?.name || "your organization"
          } and is pending approval by your Risk Officer.`
      );
    } else {
      setServerError(res.message || "Registration failed. Please check your information.");
    }
  };

  // Submit Risk Officer Registration (Full Organization + Officer)
  const handleOfficerRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

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

    if (!orgRes.isValid || !indRes.isValid || !typeRes.isValid || !distRes.isValid || !secRes.isValid || contactEmailErr || descErr) {
      return;
    }

    const payload = {
      fullName,
      email,
      phoneNumber,
      gender,
      password,
      organization: {
        name: orgName,
        industry,
        businessType,
        district,
        sector,
        streetNumber,
        productTypes,
        contactEmail: contactEmail.trim() || undefined,
        description: description.trim() || undefined,
      },
    };

    const res = await register(payload);
    if (res.success) {
      navigate("/dashboard");
    } else {
      setServerError(res.message || authError || "Registration failed. Please check your data.");
    }
  };

  // Render Employee Registration Success Screen
  if (employeeSuccessMessage) {
    return (
      <div className="min-h-screen bg-surface flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-surface-container-lowest py-8 px-6 shadow-xl border border-outline-variant rounded-3xl sm:px-10 text-center space-y-6 animate-in zoom-in-95">
            <div className="w-16 h-16 bg-tertiary-container text-on-tertiary-container rounded-2xl flex items-center justify-center mx-auto shadow-sm">
              <Clock className="w-8 h-8 animate-pulse" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black text-primary">Registration Submitted!</h2>
              <span className="inline-block px-3 py-1 bg-amber-500/10 text-amber-600 border border-amber-500/30 rounded-full text-xs font-bold uppercase tracking-wider">
                Status: Pending Approval
              </span>
            </div>

            <p className="text-xs text-on-surface-variant font-medium leading-relaxed">
              {employeeSuccessMessage}
            </p>

            <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant text-left text-xs space-y-1.5">
              <p className="font-bold text-primary">Next Steps:</p>
              <p className="text-on-surface-variant text-[11px]">
                1. Your organization's Risk Officer will review and accept your employee access request.
              </p>
              <p className="text-on-surface-variant text-[11px]">
                2. Once approved, you can log in to submit operational and business documents for risk analysis.
              </p>
            </div>

            <Link
              to="/login"
              className="block w-full py-3 rounded-xl bg-primary text-on-primary font-bold text-xs hover:bg-primary/90 transition-all shadow-sm"
            >
              Return to Login Portal
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-center py-10 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-on-primary shadow-lg shadow-primary/20">
            <ShieldAlert className="w-7 h-7 text-secondary" />
          </div>
        </div>
        <h2 className="text-center text-2xl font-black text-primary tracking-tight">
          Create Your ERIDSS Account
        </h2>
        <p className="mt-1 text-center text-xs sm:text-sm text-on-surface-variant font-medium">
          Enterprise Risk Intelligence & Decision Support Platform
        </p>

        {/* Account Role Selector */}
        <div className="mt-6 p-1.5 bg-surface-container-low border border-outline-variant rounded-2xl grid grid-cols-2 gap-2 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setAccountType("RISK_OFFICER");
              setStep(1);
              setServerError(null);
            }}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl transition-all cursor-pointer ${
              accountType === "RISK_OFFICER"
                ? "bg-surface-container-lowest text-primary shadow-xs border border-outline-variant font-black"
                : "text-on-surface-variant hover:text-primary"
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
            <span>Risk Officer (Enterprise)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAccountType("EMPLOYEE");
              setServerError(null);
            }}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl transition-all cursor-pointer ${
              accountType === "EMPLOYEE"
                ? "bg-surface-container-lowest text-primary shadow-xs border border-outline-variant font-black"
                : "text-on-surface-variant hover:text-primary"
            }`}
          >
            <Users className="w-4 h-4 text-secondary shrink-0" />
            <span>Employee (Join Org)</span>
          </button>
        </div>

        {/* Wizard Step Progress for Risk Officer */}
        {accountType === "RISK_OFFICER" && (
          <div className="mt-4 flex items-center justify-center gap-3 text-xs font-bold">
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all ${
                step === 1
                  ? "bg-primary text-on-primary border-primary"
                  : "bg-surface-container text-on-surface-variant border-outline-variant"
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">1</span>
              <span>Personal Details</span>
            </div>
            <div className="w-6 h-0.5 bg-outline-variant" />
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all ${
                step === 2
                  ? "bg-primary text-on-primary border-primary"
                  : "bg-surface-container text-on-surface-variant border-outline-variant"
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">2</span>
              <span>Enterprise Profile</span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-surface-container-lowest py-8 px-6 shadow-xl border border-outline-variant rounded-3xl sm:px-10">
          {/* Server Error Alert */}
          {(serverError || authError) && (
            <div className="mb-6 p-3.5 rounded-xl bg-error-container/60 border border-error/50 flex items-start gap-2.5 text-xs font-bold text-on-error-container">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-error" />
              <span>{serverError || authError}</span>
            </div>
          )}

          {/* ================================================================ */}
          {/* CASE 1: EMPLOYEE REGISTRATION FORM */}
          {/* ================================================================ */}
          {accountType === "EMPLOYEE" && (
            <form onSubmit={handleEmployeeRegister} noValidate className="space-y-4 text-xs">
              <div className="p-3 bg-secondary-container/20 border border-secondary/30 rounded-xl text-primary flex items-start gap-2.5">
                <Users className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  Join your company workspace to submit operational documents to your Risk Officer for risk assessment.
                  Your registration requires approval from your Risk Officer.
                </p>
              </div>

              {/* Full Name */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-primary uppercase tracking-wider">
                    Full Name <span className="text-secondary">*</span>
                  </label>
                  {nameError && <span className="text-[10px] font-bold text-red-500">Invalid Name</span>}
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
                  placeholder="e.g. Marie Claire Mukamana"
                />
                {nameError && (
                  <p className="text-[11px] font-bold text-red-600 mt-1">{nameError}</p>
                )}
              </div>

              {/* Corporate Email */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-primary uppercase tracking-wider">
                    Corporate Email <span className="text-secondary">*</span>
                  </label>
                  {emailError && <span className="text-[10px] font-bold text-red-500">Invalid Email</span>}
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
                  placeholder="e.g. marie@company.rw"
                />
                {emailError && (
                  <p className="text-[11px] font-bold text-red-600 mt-1">{emailError}</p>
                )}
              </div>

              {/* Phone & Gender */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-primary uppercase tracking-wider">
                      Phone Number
                    </label>
                    {phoneError && <span className="text-[10px] font-bold text-red-500">Invalid</span>}
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
                    placeholder="+250 788 123 456"
                  />
                  {phoneError && (
                    <p className="text-[11px] font-bold text-red-600 mt-1">{phoneError}</p>
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

              {/* Organization Selection & Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-primary uppercase tracking-wider">
                      Select Organization <span className="text-secondary">*</span>
                    </label>
                    {orgSelectError && <span className="text-[10px] font-bold text-red-500">Required</span>}
                  </div>
                  <select
                    value={selectedOrgId}
                    onChange={(e) => {
                      setSelectedOrgId(Number(e.target.value));
                      setOrgSelectError(null);
                    }}
                    className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                  >
                    {loadingOrgs ? (
                      <option value="">Loading organizations...</option>
                    ) : organizations.length === 0 ? (
                      <option value="">No organizations available</option>
                    ) : (
                      organizations.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name} ({o.industry || "Enterprise"})
                        </option>
                      ))
                    )}
                  </select>
                  {orgSelectError && (
                    <p className="text-[11px] font-bold text-red-600 mt-1">{orgSelectError}</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-primary uppercase tracking-wider">
                      Department <span className="text-secondary">*</span>
                    </label>
                    {deptError && <span className="text-[10px] font-bold text-red-500">Invalid</span>}
                  </div>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => {
                      setDepartment(e.target.value);
                      setDeptError(validateRequired(e.target.value, "Department", 2).error);
                    }}
                    className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-semibold text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g. Loan Operations"
                  />
                  {deptError && <p className="text-[11px] font-bold text-red-600 mt-1">{deptError}</p>}
                </div>
              </div>

              {/* Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-primary uppercase tracking-wider">
                      Password <span className="text-secondary">*</span>
                    </label>
                    {passwordError && <span className="text-[10px] font-bold text-red-500">Invalid</span>}
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
                    <p className="text-[11px] font-bold text-red-600 mt-1">{passwordError}</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-primary uppercase tracking-wider">
                      Confirm Password <span className="text-secondary">*</span>
                    </label>
                    {confirmPasswordError && (
                      <span className="text-[10px] font-bold text-red-500">Mismatch</span>
                    )}
                  </div>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold focus:outline-none transition-all ${
                      confirmPasswordError
                        ? "border-2 border-red-500 bg-red-500/10 text-red-700 placeholder:text-red-300 focus:ring-2 focus:ring-red-400"
                        : "bg-surface-container-low border border-outline-variant text-primary focus:ring-2 focus:ring-primary"
                    }`}
                  />
                  {confirmPasswordError && (
                    <p className="text-[11px] font-bold text-red-600 mt-1">{confirmPasswordError}</p>
                  )}
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary text-on-primary font-bold text-xs hover:bg-primary/90 transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Submit Employee Registration</span>
                      <ArrowRight className="w-4 h-4 text-secondary" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ================================================================ */}
          {/* CASE 2: RISK OFFICER REGISTRATION (STEP 1: PERSONAL) */}
          {/* ================================================================ */}
          {accountType === "RISK_OFFICER" && step === 1 && (
            <form onSubmit={handleProceedToStep2} noValidate className="space-y-4 text-xs">
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl text-primary flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  As a Risk Officer, you will register your enterprise organization and obtain full governance to
                  calculate Risk Indices, manage mitigations, and approve employees.
                </p>
              </div>

              {/* Full Name */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-primary uppercase tracking-wider">
                    Full Name <span className="text-secondary">*</span>
                  </label>
                  {nameError && <span className="text-[10px] font-bold text-red-500">Invalid</span>}
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
                  placeholder="e.g. Emmanuel Ndayisaba"
                />
                {nameError && <p className="text-[11px] font-bold text-red-600 mt-1">{nameError}</p>}
              </div>

              {/* Corporate Email */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-primary uppercase tracking-wider">
                    Corporate Email <span className="text-secondary">*</span>
                  </label>
                  {emailError && <span className="text-[10px] font-bold text-red-500">Invalid</span>}
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
                  placeholder="e.g. emmanuel@enterprise.rw"
                />
                {emailError && <p className="text-[11px] font-bold text-red-600 mt-1">{emailError}</p>}
              </div>

              {/* Phone & Gender */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-primary uppercase tracking-wider">
                      Phone Number
                    </label>
                    {phoneError && <span className="text-[10px] font-bold text-red-500">Invalid</span>}
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
                    placeholder="+250 788 123 456"
                  />
                  {phoneError && <p className="text-[11px] font-bold text-red-600 mt-1">{phoneError}</p>}
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

              {/* Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-primary uppercase tracking-wider">
                      Password <span className="text-secondary">*</span>
                    </label>
                    {passwordError && <span className="text-[10px] font-bold text-red-500">Invalid</span>}
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
                  {passwordError && <p className="text-[11px] font-bold text-red-600 mt-1">{passwordError}</p>}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-primary uppercase tracking-wider">
                      Confirm Password <span className="text-secondary">*</span>
                    </label>
                    {confirmPasswordError && (
                      <span className="text-[10px] font-bold text-red-500">Mismatch</span>
                    )}
                  </div>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold focus:outline-none transition-all ${
                      confirmPasswordError
                        ? "border-2 border-red-500 bg-red-500/10 text-red-700 placeholder:text-red-300 focus:ring-2 focus:ring-red-400"
                        : "bg-surface-container-low border border-outline-variant text-primary focus:ring-2 focus:ring-primary"
                    }`}
                  />
                  {confirmPasswordError && (
                    <p className="text-[11px] font-bold text-red-600 mt-1">{confirmPasswordError}</p>
                  )}
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary text-on-primary font-bold text-xs hover:bg-primary/90 transition-all cursor-pointer shadow-md"
                >
                  <span>Continue to Enterprise Profile</span>
                  <ArrowRight className="w-4 h-4 text-secondary" />
                </button>
              </div>
            </form>
          )}

          {/* ================================================================ */}
          {/* CASE 2: RISK OFFICER REGISTRATION (STEP 2: BUSINESS INFO) */}
          {/* ================================================================ */}
          {accountType === "RISK_OFFICER" && step === 2 && (
            <form onSubmit={handleOfficerRegister} noValidate className="space-y-4 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-outline-variant">
                <span className="font-extrabold text-primary text-xs uppercase tracking-wide">
                  Step 2: Organization Profile
                </span>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1 text-[11px] font-bold text-on-surface-variant hover:text-primary cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to User Info</span>
                </button>
              </div>

              {/* Organization Name */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-primary uppercase tracking-wider">
                    Enterprise Legal Name <span className="text-secondary">*</span>
                  </label>
                  {orgNameError && <span className="text-[10px] font-bold text-red-500">Invalid</span>}
                </div>
                <input
                  type="text"
                  required
                  value={orgName}
                  onChange={(e) => handleOrgNameChange(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold focus:outline-none transition-all ${
                    orgNameError
                      ? "border-2 border-red-500 bg-red-500/10 text-red-700 placeholder:text-red-300 focus:ring-2 focus:ring-red-400"
                      : "bg-surface-container-low border border-outline-variant text-primary focus:ring-2 focus:ring-primary"
                  }`}
                  placeholder="e.g. Rwanda Kabuhariwe Microfinance Ltd"
                />
                {orgNameError && <p className="text-[11px] font-bold text-red-600 mt-1">{orgNameError}</p>}
              </div>

              {/* Industry & Business Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-primary uppercase tracking-wider">
                      Industry Sector <span className="text-secondary">*</span>
                    </label>
                    {industryError && <span className="text-[10px] font-bold text-red-500">Invalid</span>}
                  </div>
                  <input
                    type="text"
                    required
                    value={industry}
                    onChange={(e) => handleIndustryChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-semibold text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g. Financial Services"
                  />
                  {industryError && <p className="text-[11px] font-bold text-red-600 mt-1">{industryError}</p>}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-primary uppercase tracking-wider">
                      Business Type <span className="text-secondary">*</span>
                    </label>
                    {businessTypeError && <span className="text-[10px] font-bold text-red-500">Invalid</span>}
                  </div>
                  <input
                    type="text"
                    required
                    value={businessType}
                    onChange={(e) => handleBusinessTypeChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-semibold text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g. Digital Micro-Lending"
                  />
                  {businessTypeError && (
                    <p className="text-[11px] font-bold text-red-600 mt-1">{businessTypeError}</p>
                  )}
                </div>
              </div>

              {/* Location: District, Sector, Street */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-primary uppercase tracking-wider">
                      District <span className="text-secondary">*</span>
                    </label>
                    {districtError && <span className="text-[10px] font-bold text-red-500">Invalid</span>}
                  </div>
                  <input
                    type="text"
                    required
                    value={district}
                    onChange={(e) => handleDistrictChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-semibold text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  {districtError && <p className="text-[11px] font-bold text-red-600 mt-1">{districtError}</p>}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-primary uppercase tracking-wider">
                      Sector <span className="text-secondary">*</span>
                    </label>
                    {sectorError && <span className="text-[10px] font-bold text-red-500">Invalid</span>}
                  </div>
                  <input
                    type="text"
                    required
                    value={sector}
                    onChange={(e) => handleSectorChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-semibold text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  {sectorError && <p className="text-[11px] font-bold text-red-600 mt-1">{sectorError}</p>}
                </div>

                <div>
                  <label className="block font-bold text-primary mb-1 uppercase tracking-wider">
                    Street / Plot
                  </label>
                  <input
                    type="text"
                    value={streetNumber}
                    onChange={(e) => setStreetNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-semibold text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="KN 45 St, #12"
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
                  value={productTypes}
                  onChange={(e) => setProductTypes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-semibold text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g. Working Capital Loans, Agri-Credit"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-primary uppercase tracking-wider">
                    Operational Scope & Description
                  </label>
                  {descriptionError && <span className="text-[10px] font-bold text-red-500">Invalid</span>}
                </div>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => handleDescriptionChange(e.target.value)}
                  className="w-full px-3.5 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-semibold text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Brief summary of business operations..."
                />
                {descriptionError && (
                  <p className="text-[11px] font-bold text-red-600 mt-1">{descriptionError}</p>
                )}
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-1/3 py-3 px-3 rounded-xl bg-surface-container hover:bg-surface-container-high text-primary font-bold text-xs cursor-pointer transition-all"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-2/3 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary text-on-primary font-bold text-xs hover:bg-primary/90 transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Complete Registration</span>
                      <CheckCircle2 className="w-4 h-4 text-secondary" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Footer Link to Login */}
          <div className="mt-6 pt-4 border-t border-outline-variant text-center">
            <p className="text-xs text-on-surface-variant font-medium">
              Already have an account?{" "}
              <Link to="/login" className="font-bold text-primary hover:underline">
                Sign in to ERIDSS
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
