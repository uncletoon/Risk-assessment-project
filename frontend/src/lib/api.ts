// ============================================================================
// ERIDSS Frontend API Client
// ============================================================================

export interface Assessment {
  id: number;
  organization_id: number;
  org_name?: string;
  org_industry?: string;
  org_description?: string;
  title: string;
  target_type?: 'ENTERPRISE' | 'SINGLE_USER';
  client_name?: string;
  client_identifier?: string;
  rule_group_id?: number;
  rule_group_name?: string;
  status: 'UPLOADED' | 'PROCESSING' | 'EXTRACTING' | 'ASSESSING' | 'ANALYZING' | 'COMPLETED' | 'FAILED';
  progress_step?: string;
  failure_reason?: string;
  overall_eri?: number;
  eri_classification?: string;
  eri_explanation?: string;
  methodology_snapshot?: any;
  document_summary?: string;
  document_name?: string;
  file_size?: number;
  creator_name?: string;
  risk_count?: number;
  mitigation_count?: number;
  created_at: string;
  completed_at?: string;
}

export interface RuleGroup {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  rules_count?: number;
  active_rules_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ExtractedFact {
  id: number;
  category_code: string;
  fact_key: string;
  fact_value: string;
  numerical_value?: number;
  raw_evidence_text: string;
  source_location?: string;
  confidence: number;
}

export interface IdentifiedRisk {
  id: number;
  assessment_id: number;
  category_code: string;
  category_name?: string;
  risk_name: string;
  risk_description: string;
  likelihood: number;
  impact: number;
  inherent_risk: number;
  inherent_classification: string;
  control_score: number;
  control_status: 'EVALUATED' | 'INSUFFICIENT_DATA';
  residual_risk: number;
  residual_classification: string;
  explanation?: string;
  confidence: string;
  evidence_list?: Array<{ id: number; evidence_text: string; source_location: string; confidence: string }>;
  controls_list?: Array<{ id: number; control_name: string; control_type: string; effectiveness_pct: number; status: string; source_evidence: string }>;
}

export interface RiskScore {
  id: number;
  assessment_id: number;
  category_code: string;
  category_name?: string;
  category_desc?: string;
  category_score: number;
  category_weight: number;
  weighted_score: number;
}

export interface AIAnalysis {
  id: number;
  assessment_id: number;
  executive_summary: string;
  risk_position_overview?: string;
  top_risk_drivers?: Array<{ driver_title: string; category: string; impact_summary: string; supporting_evidence: string }>;
  strategic_implications?: string;
}

export interface AIRecommendation {
  id: number;
  assessment_id: number;
  identified_risk_id?: number;
  risk_name?: string;
  category_code?: string;
  title: string;
  recommendation_text: string;
  priority: 'IMMEDIATE' | 'SHORT_TERM' | 'MEDIUM_TERM';
  suggested_timeframe: string;
  expected_outcome?: string;
  is_converted?: boolean;
  mitigation_id?: number;
}

export interface DetectedPersonalInfoItem {
  type: string;
  snippet: string;
  recommendation: string;
}

export interface PrivacyEvaluationResult {
  assessmentId: number;
  contains_personal_info: boolean;
  summary: string;
  detected_items: DetectedPersonalInfoItem[];
}

export interface MitigationAction {
  id: number;
  assessment_id: number;
  identified_risk_id?: number;
  recommendation_id?: number;
  title: string;
  action_description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  assigned_to: string;
  department: string;
  due_date?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  progress_pct: number;
  expected_outcome?: string;
  notes?: string;
  risk_name?: string;
  category_code?: string;
  assessment_title?: string;
  org_name?: string;
  created_at: string;
  updated_at?: string;
}

export interface AssessmentDetailsResponse {
  assessment: Assessment;
  document: {
    id: number;
    filename: string;
    original_name: string;
    mime_type: string;
    file_size: number;
    extracted_text_preview?: string;
    metadata?: any;
    created_at: string;
  } | null;
  extractedFacts: ExtractedFact[];
  identifiedRisks: IdentifiedRisk[];
  riskScores: RiskScore[];
  aiAnalysis: AIAnalysis | null;
  recommendations: AIRecommendation[];
  mitigations: MitigationAction[];
}

function getAuthHeader(): HeadersInit {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('eridss_token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(errorData.message || `Request failed with status ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Dashboard
  getDashboard: async (organizationId?: number) => {
    const url = organizationId ? `/api/dashboard?organizationId=${organizationId}` : '/api/dashboard';
    const res = await fetch(url, { headers: getAuthHeader() });
    return handleResponse<any>(res);
  },

  // Assessments
  getAssessments: async (organizationId?: number) => {
    const url = organizationId ? `/api/assessments?organizationId=${organizationId}` : '/api/assessments';
    const res = await fetch(url, { headers: getAuthHeader() });
    return handleResponse<Assessment[]>(res);
  },

  getAssessment: async (id: number | string) => {
    const res = await fetch(`/api/assessments/${id}`, { headers: getAuthHeader() });
    return handleResponse<AssessmentDetailsResponse>(res);
  },

  deleteAssessment: async (assessmentId: number) => {
    const res = await fetch(`/api/assessments/${assessmentId}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    return handleResponse<{ message: string; assessment: Assessment }>(res);
  },

  createAssessment: async (data: {
    organizationId: number;
    title?: string;
    clientName?: string;
    client_name?: string;
    clientIdentifier?: string;
    client_identifier?: string;
    ruleGroupId?: number;
    rule_group_id?: number;
  }) => {
    const res = await fetch('/api/assessments', {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
    return handleResponse<Assessment>(res);
  },

  uploadDocument: async (assessmentId: number, file: File, replace: boolean = false) => {
    const token = localStorage.getItem('eridss_token');
    const formData = new FormData();
    formData.append('document', file);

    const res = await fetch(`/api/assessments/${assessmentId}/document?replace=${replace}`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    return handleResponse<{ message: string; document: any }>(res);
  },

  processAssessment: async (assessmentId: number) => {
    const res = await fetch(`/api/assessments/${assessmentId}/process`, {
      method: 'POST',
      headers: getAuthHeader(),
    });
    return handleResponse<any>(res);
  },

  evaluateAssessmentPrivacy: async (assessmentId: number) => {
    const res = await fetch(`/api/assessments/${assessmentId}/evaluate-privacy`, {
      method: 'POST',
      headers: getAuthHeader(),
    });
    return handleResponse<PrivacyEvaluationResult>(res);
  },

  // Mitigations
  getMitigations: async (params?: { assessmentId?: number; organizationId?: number }) => {
    const query = new URLSearchParams();
    if (params?.assessmentId) query.append('assessmentId', params.assessmentId.toString());
    if (params?.organizationId) query.append('organizationId', params.organizationId.toString());
    const res = await fetch(`/api/mitigations?${query.toString()}`, { headers: getAuthHeader() });
    return handleResponse<MitigationAction[]>(res);
  },

  createMitigation: async (data: Partial<MitigationAction>) => {
    const res = await fetch('/api/mitigations', {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
    return handleResponse<MitigationAction>(res);
  },

  updateMitigation: async (id: number, data: Partial<MitigationAction>) => {
    const res = await fetch(`/api/mitigations/${id}`, {
      method: 'PATCH',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
    return handleResponse<MitigationAction>(res);
  },

  getMitigationStats: async (organizationId?: number) => {
    const url = organizationId ? `/api/mitigations/stats?organizationId=${organizationId}` : '/api/mitigations/stats';
    const res = await fetch(url, { headers: getAuthHeader() });
    return handleResponse<any>(res);
  },

  // Reports
  getReport: async (assessmentId: number) => {
    const res = await fetch(`/api/reports/${assessmentId}`, { headers: getAuthHeader() });
    return handleResponse<any>(res);
  },

  // AI Risk Advisor
  askAdvisor: async (data: { assessmentId: number; question: string; chatHistory?: Array<{ role: string; content: string }> }) => {
    const res = await fetch('/api/ai/advisor/query', {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
    return handleResponse<{ question: string; answer: string; timestamp: string }>(res);
  },

  // Auth & Profile
  getPublicOrganizations: async () => {
    const res = await fetch('/api/auth/organizations');
    return handleResponse<any[]>(res);
  },

  register: async (data: any) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<{ token?: string; user?: any; message?: string }>(res);
  },

  updateUserProfile: async (data: { full_name?: string; email?: string; phone_number?: string; gender?: string }) => {
    const res = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  // Employee Submissions & Management
  submitEmployeeDocument: async (file: File, title: string, description: string) => {
    const token = localStorage.getItem('eridss_token');
    const formData = new FormData();
    formData.append('document', file);
    formData.append('title', title);
    formData.append('description', description);

    const res = await fetch('/api/employee/submissions', {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    return handleResponse<{ message: string; submission: any }>(res);
  },

  getEmployeeSubmissions: async () => {
    const res = await fetch('/api/employee/submissions', { headers: getAuthHeader() });
    return handleResponse<any[]>(res);
  },

  getOrganizationEmployees: async () => {
    const res = await fetch('/api/employee/organization/employees', { headers: getAuthHeader() });
    return handleResponse<any[]>(res);
  },

  getEmployeeDetails: async (id: number) => {
    const res = await fetch(`/api/employee/organization/employees/${id}`, { headers: getAuthHeader() });
    return handleResponse<any>(res);
  },

  updateEmployeeStatus: async (id: number, status: 'accept' | 'decline' | 'enable' | 'disable' | string) => {
    const res = await fetch(`/api/employee/organization/employees/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeader(),
      body: JSON.stringify({ status }),
    });
    return handleResponse<{ message: string; employee: any }>(res);
  },

  getOrganizationSubmissions: async () => {
    const res = await fetch('/api/employee/organization/submissions', { headers: getAuthHeader() });
    return handleResponse<any[]>(res);
  },

  downloadSubmission: async (id: number, fallbackName = 'document') => {
    const res = await fetch(`/api/employee/submissions/${id}/download`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Download failed' }));
      throw new Error(err.message || 'Download failed');
    }
    const blob = await res.blob();
    const disposition = res.headers.get('Content-Disposition');
    let filename = fallbackName;
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) {
        filename = decodeURIComponent(match[1]);
      }
    }
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  // Organizations
  getOrganizations: async () => {
    const res = await fetch('/api/organizations', { headers: getAuthHeader() });
    return handleResponse<any[]>(res);
  },

  createOrganization: async (data: {
    name: string;
    industry?: string;
    description?: string;
    contact_email?: string;
    business_type?: string;
    district?: string;
    sector?: string;
    street_number?: string;
    product_types?: string;
  }) => {
    const res = await fetch('/api/organizations', {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  updateOrganization: async (
    id: number,
    data: {
      name?: string;
      industry?: string;
      description?: string;
      contact_email?: string;
      business_type?: string;
      district?: string;
      sector?: string;
      street_number?: string;
      product_types?: string;
    }
  ) => {
    const res = await fetch(`/api/organizations/${id}`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  // Admin Endpoints
  getAdminUsers: async () => {
    const res = await fetch('/api/admin/users', { headers: getAuthHeader() });
    return handleResponse<any[]>(res);
  },

  getAdminUserDetails: async (id: number) => {
    const res = await fetch(`/api/admin/users/${id}`, { headers: getAuthHeader() });
    return handleResponse<any>(res);
  },

  createAdminUser: async (data: any) => {
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  updateAdminUser: async (id: number, data: any) => {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  updateAdminUserStatus: async (id: number, status: 'active' | 'inactive') => {
    const res = await fetch(`/api/admin/users/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeader(),
      body: JSON.stringify({ status }),
    });
    return handleResponse<any>(res);
  },

  getAdminCategories: async () => {
    const res = await fetch('/api/admin/categories', { headers: getAuthHeader() });
    return handleResponse<any[]>(res);
  },

  createAdminCategory: async (data: { code: string; name: string; defaultWeight?: number; default_weight?: number; description?: string; isActive?: boolean; is_active?: boolean }) => {
    const res = await fetch('/api/admin/categories', {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  updateAdminCategory: async (code: string, data: { name?: string; defaultWeight?: number; default_weight?: number; description?: string; isActive?: boolean; is_active?: boolean }) => {
    const res = await fetch(`/api/admin/categories/${code}`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  deleteAdminCategory: async (code: string) => {
    const res = await fetch(`/api/admin/categories/${code}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    return handleResponse<{ success: boolean; message?: string }>(res);
  },

  updateAdminCategoryWeight: async (code: string, defaultWeight: number) => {
    const res = await fetch(`/api/admin/categories/${code}/weight`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify({ defaultWeight }),
    });
    return handleResponse<any>(res);
  },

  updateAdminCategoryWeightsBatch: async (weights: Array<{ code: string; defaultWeight: number }>) => {
    const res = await fetch('/api/admin/categories/weights', {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify({ weights }),
    });
    return handleResponse<any[]>(res);
  },

  // Risk Rule Groups Management
  getAdminRuleGroups: async () => {
    const res = await fetch('/api/admin/rule-groups', { headers: getAuthHeader() });
    return handleResponse<RuleGroup[]>(res);
  },

  createAdminRuleGroup: async (data: { name: string; description?: string; isActive?: boolean }) => {
    const res = await fetch('/api/admin/rule-groups', {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
    return handleResponse<RuleGroup>(res);
  },

  updateAdminRuleGroup: async (id: number, data: Partial<RuleGroup>) => {
    const res = await fetch(`/api/admin/rule-groups/${id}`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
    return handleResponse<RuleGroup>(res);
  },

  deleteAdminRuleGroup: async (id: number) => {
    const res = await fetch(`/api/admin/rule-groups/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    return handleResponse<{ success: boolean; message: string }>(res);
  },

  // Deterministic Rules Management
  getAdminRules: async (groupId?: number) => {
    const url = groupId ? `/api/admin/rules?groupId=${groupId}` : '/api/admin/rules';
    const res = await fetch(url, { headers: getAuthHeader() });
    return handleResponse<any[]>(res);
  },

  createAdminRule: async (data: any) => {
    const res = await fetch('/api/admin/rules', {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  updateAdminRule: async (id: number, data: any) => {
    const res = await fetch(`/api/admin/rules/${id}`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  deleteAdminRule: async (id: number) => {
    const res = await fetch(`/api/admin/rules/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    return handleResponse<{ success: boolean }>(res);
  },

  getAdminAuditLogs: async (params?: { limit?: number; action?: string; actor?: string; entityType?: string; startDate?: string; endDate?: string }) => {
    const query = new URLSearchParams();
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.action) query.append('action', params.action);
    if (params?.actor) query.append('actor', params.actor);
    if (params?.entityType) query.append('entityType', params.entityType);
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);

    const res = await fetch(`/api/admin/audit-logs?${query.toString()}`, { headers: getAuthHeader() });
    return handleResponse<any[]>(res);
  },

  exportAdminAuditLogsCsv: async (params?: { action?: string; actor?: string; entityType?: string; startDate?: string; endDate?: string }) => {
    const token = localStorage.getItem('eridss_token');
    const query = new URLSearchParams();
    if (params?.action) query.append('action', params.action);
    if (params?.actor) query.append('actor', params.actor);
    if (params?.entityType) query.append('entityType', params.entityType);
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);

    const res = await fetch(`/api/admin/audit-logs/export?${query.toString()}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Export failed' }));
      throw new Error(err.message || 'Export failed');
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ERIDSS_Audit_Logs_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    return true;
  },

  getAdminHealth: async () => {
    const res = await fetch('/api/admin/health', { headers: getAuthHeader() });
    return handleResponse<any>(res);
  },

  getMethodology: async (orgId: number | string) => {
    const res = await fetch(`/api/organizations/${orgId}/methodology`, { headers: getAuthHeader() });
    return handleResponse<MethodologyConfig>(res);
  },

  updateMethodology: async (orgId: number | string, config: Partial<MethodologyConfig>) => {
    const res = await fetch(`/api/organizations/${orgId}/methodology`, {
      method: 'PUT',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return handleResponse<{ message: string; methodology: MethodologyConfig }>(res);
  },
};

export const getMethodology = api.getMethodology;
export const updateMethodology = api.updateMethodology;

export interface MethodologyConfig {
  matrix_dimension: number;
  likelihood_scale: Array<{ level: number; label: string; description: string }>;
  impact_scale: Array<{ level: number; label: string; description: string }>;
  score_bands: Array<{ name: string; min_score: number; max_score: number; color: string }>;
  category_weights: Record<string, number>;
  is_custom?: boolean;
}
