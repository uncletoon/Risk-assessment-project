-- ============================================================================
-- Enterprise Risk Intelligence and Decision Support System (ERIDSS)
-- PostgreSQL Database Initialization & Migration Schema
-- ============================================================================

-- Drop existing tables in reverse dependency order
DROP TABLE IF EXISTS employee_submissions CASCADE;
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
DROP TABLE IF EXISTS rule_groups CASCADE;
DROP TABLE IF EXISTS risk_categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- 1. Organizations
CREATE TABLE organizations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  industry VARCHAR(100) NOT NULL DEFAULT 'Financial & Enterprise Services',
  business_type VARCHAR(100),
  district VARCHAR(100),
  sector VARCHAR(100),
  street_number VARCHAR(100),
  product_types TEXT,
  description TEXT,
  contact_email VARCHAR(150),
  methodology_config JSONB DEFAULT NULL,
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
  phone_number VARCHAR(50),
  gender VARCHAR(20),
  role VARCHAR(50) NOT NULL CHECK (role IN ('SYSTEM_ADMIN', 'RISK_OFFICER', 'EMPLOYEE', 'employee')),
  department VARCHAR(100) DEFAULT 'Risk Management',
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'pending', 'rejected', 'inactive', 'suspended')),
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

-- 4. Rule Groups (Categorized rule engines e.g. Credit, Microfinance, Commercial)
CREATE TABLE rule_groups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Risk Rules (Configurable rules for deterministic scoring)
CREATE TABLE risk_rules (
  id SERIAL PRIMARY KEY,
  rule_group_id INTEGER REFERENCES rule_groups(id) ON DELETE SET NULL,
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

-- 6. Assessments (Core assessment session tracking)
CREATE TABLE assessments (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  rule_group_id INTEGER REFERENCES rule_groups(id) ON DELETE SET NULL,
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
  methodology_snapshot JSONB DEFAULT NULL,
  eri_explanation TEXT DEFAULT NULL,
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

-- 17. Employee Submissions (Multi-tenant document submissions for Risk Officer review)
CREATE TABLE employee_submissions (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assessment_id INTEGER REFERENCES assessments(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  document_name VARCHAR(255) NOT NULL,
  document_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED', 'ACCEPTED', 'REJECTED', 'PROCESSED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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
CREATE INDEX idx_employee_submissions_org ON employee_submissions(organization_id);
CREATE INDEX idx_employee_submissions_emp ON employee_submissions(employee_id);

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- 1. Organizations
INSERT INTO organizations (id, name, industry, business_type, district, sector, street_number, product_types, description, contact_email)
VALUES
  (1, 'Apex Horizon Global Enterprises', 'Financial & Enterprise Services', 'Microfinance & Digital Lending', 'Nyarugenge', 'Nyarugenge', 'KN 4 Ave, Plot 12', 'Digital Micro-Loans, SME Working Capital, Savings & Group Guarantees', 'Multinational conglomerate operating in digital financial infrastructure, logistics, and cloud platforms.', 'compliance@apexhorizon.com')
ON CONFLICT (id) DO NOTHING;

-- 2. Users (Password is 'Admin@123' and 'Officer@123' hashed with bcrypt)
INSERT INTO users (id, organization_id, full_name, email, password, phone_number, gender, role, department)
VALUES
  (1, 1, 'Dr. Marcus Vance (Admin)', 'admin@eridss.com', '$2b$10$pG6vIdF2IrXN6ZtoJbcWw.zoRmhTAGoyuFmnfQkK5BOltZQgdhKc.', '+250 788 123 456', 'Male', 'SYSTEM_ADMIN', 'Enterprise Risk Governance'),
  (2, 1, 'Sarah Jenkins (Risk Officer)', 'officer@eridss.com', '$2b$10$0zYKjoCgvHfBJyA.UXsqYOqBZNLJVlbnf8IFsotZxIKhqiV8OV1Mq', '+250 788 654 321', 'Female', 'RISK_OFFICER', 'Enterprise Risk Governance')
ON CONFLICT (id) DO UPDATE SET password = EXCLUDED.password;

-- 3. Single Client Credit Risk Categories (weights sum to 100%)
INSERT INTO risk_categories (code, name, default_weight, description)
VALUES
  ('REPAYMENT_CAPACITY', 'Repayment Capacity & Affordability', 30.00, 'Ability to meet the proposed repayment from verified disposable income and recurring cash flow.'),
  ('DEBT_BURDEN', 'Existing Debt & Leverage', 20.00, 'Existing obligations, leverage, debt service burden, and available borrowing headroom.'),
  ('INCOME_STABILITY', 'Income & Cash Flow Stability', 15.00, 'Consistency, source quality, volatility, and sustainability of income or business cash flow.'),
  ('CREDIT_BEHAVIOR', 'Credit & Repayment Behavior', 15.00, 'Previous repayment conduct, arrears, missed payments, account behavior, and credit history.'),
  ('COLLATERAL_GUARANTEE', 'Collateral & Guarantee Coverage', 10.00, 'Quality, ownership, enforceability, valuation, and coverage provided by collateral or guarantees.'),
  ('KYC_DATA_QUALITY', 'KYC, Fraud & Data Quality', 10.00, 'Identity consistency, document reliability, missing information, contradictions, and fraud indicators.')
ON CONFLICT (code) DO UPDATE SET 
  name = EXCLUDED.name,
  default_weight = EXCLUDED.default_weight,
  description = EXCLUDED.description;

-- 4. Default Rule Groups
INSERT INTO rule_groups (id, name, description, is_active)
VALUES 
  (1, 'Standard Individual Credit Rules', 'General risk rules engine for personal loans, salary-backed credit, and individual financial health.', true),
  (2, 'Microfinance & Small Enterprise Rules', 'Specialized rules engine evaluating micro-credit turnover, working capital ratios, and loan guarantee coverages.', true),
  (3, 'High-Net-Worth & Commercial Lending Rules', 'Deep liquidity, leverage ratios, and asset-backed debt capacity assessment rules.', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Default Deterministic Risk Rules
INSERT INTO risk_rules (rule_group_id, category_code, factor_name, condition_operator, threshold_value, likelihood_score, impact_score, severity, description)
VALUES
  (1, 'DEBT_BURDEN', 'Debt-to-Income Ratio', 'GT', '40%', 4, 4, 'High', 'Debt obligations above 40% of verified income can materially weaken repayment capacity.'),
  (1, 'REPAYMENT_CAPACITY', 'Debt Service Ratio', 'GT', '40%', 4, 5, 'Critical', 'Debt service above 40% of verified disposable income leaves limited repayment buffer.'),
  (1, 'INCOME_STABILITY', 'Operating Cash Flow Deficit', 'LT', '0', 4, 5, 'Critical', 'Negative recurring cash flow directly threatens ongoing repayment ability.'),
  (1, 'REPAYMENT_CAPACITY', 'Short-term Liquidity Ratio', 'LT', '1.0', 4, 4, 'High', 'Liquidity below 1.0 indicates insufficient near-term resources for obligations.'),
  (1, 'INCOME_STABILITY', 'Income Volatility', 'GT', '30%', 3, 4, 'High', 'Large income variation reduces confidence in recurring repayment resources.'),
  (1, 'CREDIT_BEHAVIOR', 'Late Payment Count', 'GT', '0', 4, 4, 'High', 'Recent late payments indicate elevated repayment behavior risk.'),
  (1, 'COLLATERAL_GUARANTEE', 'Collateral Coverage Ratio', 'LT', '100%', 3, 4, 'High', 'Collateral value below the exposure leaves an unsecured recovery gap.'),
  (1, 'KYC_DATA_QUALITY', 'Document Inconsistency', 'CONTAINS', 'inconsistent', 5, 5, 'Critical', 'Conflicting identity or financial records require verification before a credit decision.')
ON CONFLICT DO NOTHING;

-- Reset sequences
SELECT setval(pg_get_serial_sequence('organizations', 'id'), COALESCE((SELECT MAX(id) FROM organizations), 1));
SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE((SELECT MAX(id) FROM users), 1));
SELECT setval(pg_get_serial_sequence('rule_groups', 'id'), COALESCE((SELECT MAX(id) FROM rule_groups), 1));
SELECT setval(pg_get_serial_sequence('risk_categories', 'id'), COALESCE((SELECT MAX(id) FROM risk_categories), 1));
SELECT setval(pg_get_serial_sequence('risk_rules', 'id'), COALESCE((SELECT MAX(id) FROM risk_rules), 1));