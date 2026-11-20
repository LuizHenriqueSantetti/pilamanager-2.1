-- Projeto acadêmico independente. Não executar em banco de produção.
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('GERENCIA','ADMINISTRADOR','PROFISSIONAL','RECEPCIONISTA')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_email_normalized CHECK (email = lower(email))
);

CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  cpf VARCHAR(11) UNIQUE CHECK (cpf IS NULL OR cpf ~ '^[0-9]{11}$'),
  birth_date DATE,
  phone VARCHAR(20),
  email VARCHAR(254),
  address VARCHAR(255),
  clinical_notes TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS patients_name_idx ON patients (lower(name));
CREATE INDEX IF NOT EXISTS patients_created_at_idx ON patients (created_at DESC);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  csrf_hash CHAR(64) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);
CREATE INDEX IF NOT EXISTS sessions_expiration_idx ON sessions (expires_at);

CREATE TABLE IF NOT EXISTS login_attempts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  identifier CHAR(64) NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS login_attempts_identifier_time_idx ON login_attempts (identifier, attempted_at DESC);

CREATE TABLE IF NOT EXISTS schema_migrations (
  filename VARCHAR(180) PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
