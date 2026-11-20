-- Campos da ficha "Novo Paciente" do PilaManager 2.1 original.
-- "Queixas e Observações" continua na coluna clinical_notes.
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS special_notes TEXT,
  ADD COLUMN IF NOT EXISTS disabilities TEXT,
  ADD COLUMN IF NOT EXISTS health_problems TEXT,
  ADD COLUMN IF NOT EXISTS pain_limitations TEXT,
  ADD COLUMN IF NOT EXISTS goals TEXT,
  ADD COLUMN IF NOT EXISTS privacy_consent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS patients_email_idx ON patients (lower(email));
