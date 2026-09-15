-- ============================================================================
-- Enterprise Risk Intelligence and Decision Support System (ERIDSS)
-- PostgreSQL Database Initialization & Migration Schema
-- ============================================================================

-- Drop existing tables in reverse dependency order
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS assessment_history CASCADE;
DROP TABLE IF EXISTS mitigation_actions CASCADE;
DROP TABLE IF EXISTS ai_recommendations CASCADE;
DROP TABLE IF EXISTS ai_analyses CASCADE;
DROP TABLE IF EXISTS risk_scores CASCADE;
DROP TABLE IF EXISTS risk_controls CASCADE;
DROP TABLE IF EXISTS risk_evidence CASCADE;
DROP TABLE IF EXISTS identified_risks CASCADE;
DROP TABLE IF EXISTS extracted_facts CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS assessments CASCADE;
DROP TABLE IF EXISTS risk_rules CASCADE;
DROP TABLE IF EXISTS risk_categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- 1. Organizations
CREATE TABLE organizations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  industry VARCHAR(100) NOT NULL DEFAULT 'Financial & Enterprise Services',
  description TEXT,
  contact_email VARCHAR(150),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER REFERENCES organizations(id) ON DELETE SET NULL,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('SYSTEM_ADMIN', 'RISK_OFFICER')),
  department VARCHAR(100) DEFAULT 'Risk Management',
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Risk Categories (6 primary categories with configurable weights)
CREATE TABLE risk_categories (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL, -- FINANCIAL, OPERATIONAL, STRATEGIC, TECHNOLOGICAL, LEGAL_REGULATORY, MARKET
  name VARCHAR(100) NOT NULL,
  default_weight DECIMAL(5, 2) NOT NULL DEFAULT 16.67,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Risk Rules (Configurable rules for deterministic scoring)
CREATE TABLE risk_rules (
  id SERIAL PRIMARY KEY,
  category_code VARCHAR(50) NOT NULL REFERENCES risk_categories(code) ON DELETE CASCADE,
  factor_name VARCHAR(150) NOT NULL,
  condition_operator VARCHAR(20) NOT NULL CHECK (condition_operator IN ('GT', 'LT', 'GTE', 'LTE', 'EQ', 'CONTAINS', 'RANGE')),
  threshold_value VARCHAR(100) NOT NULL,
  likelihood_score INTEGER NOT NULL CHECK (likelihood_score BETWEEN 1 AND 5),
  impact_score INTEGER NOT NULL CHECK (impact_score BETWEEN 1 AND 5),
  severity VARCHAR(50) DEFAULT 'Moderate',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Assessments (Core assessment session tracking)
CREATE TABLE assessments (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  target_type VARCHAR(50) DEFAULT 'ENTERPRISE' CHECK (target_type IN ('ENTERPRISE', 'SINGLE_USER')),
  client_name VARCHAR(150),
  client_identifier VARCHAR(100),
  client_email VARCHAR(150),
  client_phone VARCHAR(50),
  client_income DECIMAL(18, 2),
  client_metadata JSONB DEFAULT '{}'::jsonb,
  status VARCHAR(50) DEFAULT 'UPLOADED' CHECK (status IN ('UPLOADED', 'PROCESSING', 'EXTRACTING', 'ASSESSING', 'ANALYZING', 'COMPLETED', 'FAILED')),
  progress_step VARCHAR(100) DEFAULT 'Document Received',
  failure_reason TEXT,
  overall_eri DECIMAL(5, 2),
  eri_classification VARCHAR(50), -- Very Low, Low, Moderate, High, Critical
  document_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- 6. Documents (Strict 1 document per assessment)
CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  assessment_id INTEGER UNIQUE NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  extracted_text_preview TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Extracted Facts (Structured evidence items from document)
CREATE TABLE extracted_facts (
  id SERIAL PRIMARY KEY,
  assessment_id INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  category_code VARCHAR(50) NOT NULL,
  fact_key VARCHAR(150) NOT NULL,
  fact_value TEXT NOT NULL,
  numerical_value DECIMAL(18, 4),
  raw_evidence_text TEXT,
  source_location VARCHAR(150),
  confidence DECIMAL(5, 2) DEFAULT 0.95,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Identified Risks (Deterministic assessment calculations)
CREATE TABLE identified_risks (
  id SERIAL PRIMARY KEY,
  assessment_id INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  category_code VARCHAR(50) NOT NULL REFERENCES risk_categories(code) ON DELETE CASCADE,
  risk_name VARCHAR(255) NOT NULL,
  risk_description TEXT NOT NULL,
  likelihood INTEGER NOT NULL CHECK (likelihood BETWEEN 1 AND 5),
  impact INTEGER NOT NULL CHECK (impact BETWEEN 1 AND 5),
  inherent_risk INTEGER NOT NULL, -- likelihood * impact (1 to 25)
  inherent_classification VARCHAR(50) NOT NULL, -- Very Low, Low, Moderate, High, Critical
  control_score DECIMAL(5, 2) DEFAULT 0.00, -- 0 to 100%
  control_status VARCHAR(50) DEFAULT 'INSUFFICIENT_DATA' CHECK (control_status IN ('EVALUATED', 'INSUFFICIENT_DATA')),
  residual_risk DECIMAL(5, 2) NOT NULL, -- Normalized scale
  residual_classification VARCHAR(50) NOT NULL,
  explanation TEXT,
  confidence VARCHAR(50) DEFAULT 'High',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Risk Evidence (Traceability quotes & exact source citations)
CREATE TABLE risk_evidence (
  id SERIAL PRIMARY KEY,
  identified_risk_id INTEGER NOT NULL REFERENCES identified_risks(id) ON DELETE CASCADE,
  evidence_text TEXT NOT NULL,
  source_location VARCHAR(150),
  confidence VARCHAR(50) DEFAULT 'High',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Risk Controls (Evaluated existing controls)
CREATE TABLE risk_controls (
  id SERIAL PRIMARY KEY,
  identified_risk_id INTEGER NOT NULL REFERENCES identified_risks(id) ON DELETE CASCADE,
  control_name VARCHAR(255) NOT NULL,
  control_type VARCHAR(100),
  effectiveness_pct DECIMAL(5, 2) DEFAULT 0.00,
  status VARCHAR(50) DEFAULT 'EVALUATED' CHECK (status IN ('EVALUATED', 'INSUFFICIENT_DATA', 'DEFICIENT')),
  source_evidence TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Risk Scores (Category level aggregated breakdown)
CREATE TABLE risk_scores (
  id SERIAL PRIMARY KEY,
  assessment_id INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  category_code VARCHAR(50) NOT NULL REFERENCES risk_categories(code) ON DELETE CASCADE,
  category_score DECIMAL(5, 2) NOT NULL,
  category_weight DECIMAL(5, 2) NOT NULL,
  weighted_score DECIMAL(5, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (assessment_id, category_code)
);

-- 12. AI Analyses (Gemini post-calculation intelligence & executive summaries)
CREATE TABLE ai_analyses (
  id SERIAL PRIMARY KEY,
  assessment_id INTEGER UNIQUE NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  executive_summary TEXT NOT NULL,
  risk_position_overview TEXT,
  top_risk_drivers JSONB DEFAULT '[]'::jsonb,
  strategic_implications TEXT,
  model_version VARCHAR(100) DEFAULT 'gemini-3.6-flash',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. AI Recommendations (Actionable mitigations proposed by AI)
CREATE TABLE ai_recommendations (
  id SERIAL PRIMARY KEY,
  assessment_id INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  identified_risk_id INTEGER REFERENCES identified_risks(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  recommendation_text TEXT NOT NULL,
  priority VARCHAR(50) NOT NULL CHECK (priority IN ('IMMEDIATE', 'SHORT_TERM', 'MEDIUM_TERM')),
  suggested_timeframe VARCHAR(100),
  expected_outcome TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. Mitigation Actions (Risk Officer mitigation management & tracking)
CREATE TABLE mitigation_actions (
  id SERIAL PRIMARY KEY,
  assessment_id INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  identified_risk_id INTEGER REFERENCES identified_risks(id) ON DELETE SET NULL,
  recommendation_id INTEGER REFERENCES ai_recommendations(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  action_description TEXT NOT NULL,
  priority VARCHAR(50) DEFAULT 'HIGH' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  assigned_to VARCHAR(150),
  department VARCHAR(100),
  due_date DATE,
  status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  progress_pct INTEGER DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  expected_outcome TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. Assessment History (Longitudinal ERI tracking)
CREATE TABLE assessment_history (
  id SERIAL PRIMARY KEY,
  assessment_id INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  version_label VARCHAR(50) DEFAULT 'v1.0',
  overall_eri DECIMAL(5, 2) NOT NULL,
  eri_classification VARCHAR(50) NOT NULL,
  category_scores JSONB NOT NULL,
  snapshot_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 16. Audit Logs
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  organization_id INTEGER REFERENCES organizations(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id INTEGER,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_assessments_org ON assessments(organization_id);
CREATE INDEX idx_assessments_status ON assessments(status);
CREATE INDEX idx_identified_risks_assessment ON identified_risks(assessment_id);
CREATE INDEX idx_mitigation_actions_assessment ON mitigation_actions(assessment_id);
CREATE INDEX idx_mitigation_actions_status ON mitigation_actions(status);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- 1. Organizations
INSERT INTO organizations (id, name, industry, business_type, district, sector, street_number, product_types, description, contact_email)
  (1, 'Apex Horizon Global Enterprises', 'Financial & Enterprise Services', 'Microfinance & Digital Lending', 'Nyarugenge', 'Nyarugenge', 'KN 4 Ave, Plot 12', 'Digital Micro-Loans, SME Working Capital, Savings & Group Guarantees', 'Multinational conglomerate operating in digital financial infrastructure, logistics, and cloud platforms.', 'compliance@apexhorizon.com')
ON CONFLICT (id) DO NOTHING;
-- 2. Users (Password is 'Admin@123' and 'Officer@123' hashed with bcrypt)
INSERT INTO users (id, organization_id, full_name, email, password, phone_number, gender, role, department)
VALUES
  (1, 1, 'Dr. Marcus Vance (Admin)', 'admin@eridss.com', '$2b$10$NcUp88zXaaTQaYO4IY2py.vIO6q8/eRkGr11wNrxmRG6vv7e8hxCa', '+250 788 123 456', 'Male', 'SYSTEM_ADMIN', 'Enterprise Risk Governance'),
ON CONFLICT (id) DO UPDATE SET password = EXCLUDED.password;

-- 3. Risk Categories (6 standard enterprise categories with default weights summing to 100%)
  ('FINANCIAL', 'Financial Risk', 20.00, 'Exposure to capital inadequacy, liquidity stress, debt overhang, revenue contraction, and credit volatility.'),
  ('OPERATIONAL', 'Operational Risk', 20.00, 'Vulnerabilities in internal processes, key-person dependency, supplier concentration, and business continuity failure.'),
  ('STRATEGIC', 'Strategic Risk', 15.00, 'Misalignment of business model, aggressive market expansion without buffer, M&A integration failure, or competitive disruption.'),
  ('TECHNOLOGICAL', 'Technological & Cyber Risk', 15.00, 'Legacy system vulnerability, insufficient cybersecurity controls, lack of MFA, data breach risks, and unmanaged IT dependencies.'),
  ('LEGAL_REGULATORY', 'Legal & Regulatory Risk', 10.00, 'Non-compliance with statutory standards, pending litigation, licensing vulnerability, data privacy fines (GDPR/statutory).'),
  ('MARKET', 'Market & Macro Risk', 20.00, 'Customer concentration, commodity/foreign exchange exposure, interest rate volatility, and macro-economic downturns.')
ON CONFLICT (code) DO UPDATE SET 
  name = EXCLUDED.name,
  default_weight = EXCLUDED.default_weight,
  description = EXCLUDED.description;

-- 4. Default Deterministic Risk Rules
INSERT INTO risk_rules (category_code, factor_name, condition_operator, threshold_value, likelihood_score, impact_score, severity, description)
VALUES
  ('FINANCIAL', 'Debt-to-Equity Ratio', 'GT', '2.5', 4, 4, 'High', 'High leverage increases financial distress likelihood during cash flow contractions.'),
  ('FINANCIAL', 'Operating Cash Flow Deficit', 'LT', '0', 4, 5, 'Critical', 'Negative operating cash flow directly threatens ongoing working capital and debt service obligations.'),
  ('FINANCIAL', 'Short-term Liquidity Ratio', 'LT', '1.0', 4, 4, 'High', 'Current ratio below 1.0 indicates working capital deficit within 12 months.'),
  ('OPERATIONAL', 'Supplier Concentration', 'GT', '70%', 4, 5, 'Critical', 'Single vendor supplying over 70% of vital components creates severe single-point of failure.'),
  ('OPERATIONAL', 'Disaster Recovery RTO', 'GT', '48 hours', 3, 4, 'High', 'Long recovery time objectives expose business to extended downtime and operational paralysis.'),
  ('STRATEGIC', 'Core Market Revenue Dependency', 'GT', '80%', 4, 4, 'High', 'Over 80% revenue concentrated in a single fluctuating sector without diversification.'),
  ('TECHNOLOGICAL', 'Privileged Account MFA Absence', 'EQ', 'true', 5, 5, 'Critical', 'Absence of Multi-Factor Authentication on admin accounts dramatically increases compromise probability.'),
  ('TECHNOLOGICAL', 'Unpatched Critical CVE Vulnerabilities', 'GT', '0', 4, 4, 'High', 'Known unpatched vulnerabilities in internet-facing infrastructure.'),
  ('LEGAL_REGULATORY', 'Statutory Compliance Deficiencies', 'CONTAINS', 'non-compliant', 4, 4, 'High', 'Documented regulatory infractions risking license revocation or material punitive fines.'),
  ('MARKET', 'Top 3 Customer Concentration', 'GT', '60%', 4, 4, 'High', 'Top 3 clients account for over 60% of gross revenue, elevating customer churn impact.')
ON CONFLICT DO NOTHING;

-- Reset sequences
SELECT setval(pg_get_serial_sequence('organizations', 'id'), COALESCE((SELECT MAX(id) FROM organizations), 1));
SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE((SELECT MAX(id) FROM users), 1));
SELECT setval(pg_get_serial_sequence('risk_categories', 'id'), COALESCE((SELECT MAX(id) FROM risk_categories), 1));
SELECT setval(pg_get_serial_sequence('risk_rules', 'id'), COALESCE((SELECT MAX(id) FROM risk_rules), 1));