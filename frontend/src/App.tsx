import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Sidebar from "./components/layout/Sidebar";
import TopNavbar from "./components/layout/TopNavbar";

// Core Pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import OrganizationProfile from "./pages/OrganizationProfile";
import NewAssessment from "./pages/NewAssessment";
import AssessmentList from "./pages/AssessmentList";
import AssessmentDetails from "./pages/AssessmentDetails";
import MitigationManagement from "./pages/MitigationManagement";
import AssessmentHistory from "./pages/AssessmentHistory";
import Reports from "./pages/Reports";
import EmployeeDashboard from "./pages/employee/EmployeeDashboard";

// Admin Governance Pages
import UserManagement from "./pages/admin/UserManagement";
import RiskCategories from "./pages/admin/RiskCategories";
import RiskRules from "./pages/admin/RiskRules";
import AuditLogs from "./pages/admin/AuditLogs";
import SystemHealth from "./pages/admin/SystemHealth";
import MethodologyConfig from "./pages/admin/MethodologyConfig";

function ProtectedLayout({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-background font-body-md text-body-md text-on-background antialiased flex flex-col lg:flex-row">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 lg:ml-[280px] flex flex-col min-h-screen min-w-0 w-full">
        <TopNavbar
          title={title}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          isSidebarOpen={sidebarOpen}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route
        path="/register"
        element={user ? <Navigate to="/dashboard" replace /> : <Register />}
      />

      {/* Main Dashboard */}
      <Route
        path="/dashboard"
        element={
          user?.role === "EMPLOYEE" ? (
            <Navigate to="/employee/dashboard" replace />
          ) : (
            <ProtectedLayout title="Executive Enterprise Risk Intelligence Dashboard">
              <Dashboard />
            </ProtectedLayout>
          )
        }
      />

      {/* Employee Dashboard */}
      <Route
        path="/employee/dashboard"
        element={
          <ProtectedLayout title="Employee Document Submission Portal">
            <EmployeeDashboard />
          </ProtectedLayout>
        }
      />

      {/* User & Organization Profile */}
      <Route
        path="/organization"
        element={
          <ProtectedLayout
            title={
              user?.role === "SYSTEM_ADMIN"
                ? "Administrator Account Profile"
                : "Organization Profile & Scope"
            }
          >
            <OrganizationProfile />
          </ProtectedLayout>
        }
      />

      <Route
        path="/assessments/new"
        element={
          <ProtectedLayout title="Single-Document Risk Assessment Wizard">
            <NewAssessment />
          </ProtectedLayout>
        }
      />

      <Route
        path="/assessments"
        element={
          <ProtectedLayout title="Enterprise Assessments Repository">
            <AssessmentList />
          </ProtectedLayout>
        }
      />

      <Route
        path="/assessments/:id"
        element={
          <ProtectedLayout title="Risk Decision Desk & AI Analytics">
            <AssessmentDetails />
          </ProtectedLayout>
        }
      />

      <Route
        path="/mitigations"
        element={
          <ProtectedLayout title="Risk Mitigation & Action Management">
            <MitigationManagement />
          </ProtectedLayout>
        }
      />

      <Route
        path="/history"
        element={
          <ProtectedLayout title="Longitudinal Risk Progression & Historical Trends">
            <AssessmentHistory />
          </ProtectedLayout>
        }
      />

      <Route
        path="/reports"
        element={
          <ProtectedLayout title="Audit-Ready Formal Enterprise Risk Reports">
            <Reports />
          </ProtectedLayout>
        }
      />

      {/* System Admin Governance Endpoints */}
      <Route
        path="/admin/users"
        element={
          <ProtectedLayout title="User Accounts & Permissions Governance">
            <UserManagement />
          </ProtectedLayout>
        }
      />

      <Route
        path="/admin/categories"
        element={
          <ProtectedLayout title="Risk Categories & Mathematical Weighting Engine">
            <RiskCategories />
          </ProtectedLayout>
        }
      />

      <Route
        path="/admin/methodology"
        element={
          <ProtectedLayout title="Risk Methodology & Scoring Engine Configurator">
            <MethodologyConfig />
          </ProtectedLayout>
        }
      />

      <Route
        path="/admin/rules"
        element={
          <ProtectedLayout title="Deterministic Business Rules Engine">
            <RiskRules />
          </ProtectedLayout>
        }
      />

      <Route
        path="/admin/audit-logs"
        element={
          <ProtectedLayout title="System Activity & Security Audit Trail">
            <AuditLogs />
          </ProtectedLayout>
        }
      />

      <Route
        path="/admin/health"
        element={
          <ProtectedLayout title="Database & Operational Diagnostics">
            <SystemHealth />
          </ProtectedLayout>
        }
      />

      {/* Fallback Redirect */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
