-- ============================================================
-- Digital Check Register — Initial Schema
-- SPEC §15 — All balance columns computed at app layer, never stored
-- ============================================================

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- TABLE: users
-- Mirrors Supabase Auth users; extended profile stored here
-- ============================================================
CREATE TABLE public.users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================================
-- TABLE: accounts
-- One user can have multiple bank accounts
-- routing_number and account_number encrypted at application layer
-- ============================================================
CREATE TABLE public.accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  nickname        TEXT NOT NULL CHECK (char_length(nickname) BETWEEN 1 AND 50),
  bank_name       TEXT NOT NULL,
  account_type    TEXT NOT NULL CHECK (account_type IN ('checking', 'savings')),
  routing_number  TEXT NOT NULL,   -- AES-256 encrypted at application layer; 9 digits before encryption
  account_number  TEXT NOT NULL,   -- AES-256 encrypted at application layer; 8-17 digits before encryption
  is_active       BOOLEAN DEFAULT true NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================================
-- TABLE: registers
-- One register per account per calendar month
-- opening_balance for Jan: user-set; Feb-Dec: prior month closing (app layer)
-- ============================================================
CREATE TABLE public.registers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id          UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  month               INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year                INTEGER NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  opening_balance     NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  -- User-entered during reconciliation (bank-reported values):
  current_bank_bal    NUMERIC(12,2),
  available_bank_bal  NUMERIC(12,2),
  is_locked           BOOLEAN DEFAULT false NOT NULL,
  created_at          TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at          TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (account_id, month, year)
);

-- ============================================================
-- TABLE: transactions
-- balance column is intentionally ABSENT — always computed on read
-- debit and credit are mutually exclusive (DB + UI enforced)
-- ============================================================
CREATE TABLE public.transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  register_id     UUID REFERENCES public.registers(id) ON DELETE CASCADE NOT NULL,
  row_order       INTEGER NOT NULL,  -- display sequence within month; not auto-sorted by date
  check_number    INTEGER CHECK (check_number > 0),
  date            DATE NOT NULL,     -- user intent date; future dates allowed
  description     TEXT NOT NULL CHECK (char_length(description) BETWEEN 1 AND 255),
  status          TEXT NOT NULL DEFAULT 'recorded' CHECK (
                    status IN ('recorded','scheduled','in_flight','pending','cleared','void')
                  ),
  debit           NUMERIC(12,2) CHECK (debit > 0),
  credit          NUMERIC(12,2) CHECK (credit > 0),
  -- balance column NOT stored — computed at application layer per SPEC §15
  notes           TEXT,
  scheduled_date  DATE,   -- parsed from notes when "Scheduled to be paid on" detected
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT debit_credit_exclusive CHECK (
    NOT (debit IS NOT NULL AND credit IS NOT NULL)
  )
);

-- Ordering index used on every register page load
CREATE INDEX transactions_register_order ON public.transactions (register_id, row_order);
-- Index for in-flight detection (scheduled_date < today)
CREATE INDEX transactions_scheduled_date ON public.transactions (scheduled_date) WHERE scheduled_date IS NOT NULL;

-- ============================================================
-- TABLE: audit_log
-- Append-only — NO UPDATE or DELETE ever permitted
-- Covers: edits to locked months, status transitions, void actions,
--         unlock/re-lock events, AI suggestion acceptances
-- ============================================================
CREATE TABLE public.audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES public.users(id) NOT NULL,
  account_id      UUID REFERENCES public.accounts(id) NOT NULL,
  register_id     UUID REFERENCES public.registers(id),
  transaction_id  UUID REFERENCES public.transactions(id),
  action          TEXT NOT NULL CHECK (
                    action IN (
                      'unlocked',
                      'edited',
                      'voided',
                      're-locked',
                      'status_changed',
                      'ai_suggestion_accepted',
                      'deleted'
                    )
                  ),
  field_changed   TEXT,
  value_before    TEXT,
  value_after     TEXT,
  reason          TEXT,        -- optional user note explaining edit
  ip_address      TEXT,        -- encrypted at application layer
  timestamp       TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX audit_log_user ON public.audit_log (user_id, timestamp DESC);
CREATE INDEX audit_log_register ON public.audit_log (register_id, timestamp DESC);

-- ============================================================
-- TRIGGER: updated_at auto-maintenance
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER accounts_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER registers_updated_at
  BEFORE UPDATE ON public.registers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- TRIGGER: auto-create user profile on auth.users insert
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- ROW-LEVEL SECURITY
-- Every user sees only their own data
-- ============================================================
ALTER TABLE public.users       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log   ENABLE ROW LEVEL SECURITY;

-- users: own row only
CREATE POLICY users_own ON public.users
  FOR ALL USING (auth.uid() = id);

-- accounts: own accounts only
CREATE POLICY accounts_own ON public.accounts
  FOR ALL USING (auth.uid() = user_id);

-- registers: via account ownership
CREATE POLICY registers_own ON public.registers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = account_id AND a.user_id = auth.uid()
    )
  );

-- transactions: via register → account ownership
CREATE POLICY transactions_own ON public.transactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.registers r
      JOIN public.accounts a ON a.id = r.account_id
      WHERE r.id = register_id AND a.user_id = auth.uid()
    )
  );

-- audit_log: read own entries; INSERT allowed; UPDATE/DELETE denied via separate policies
CREATE POLICY audit_log_read_own ON public.audit_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY audit_log_insert_own ON public.audit_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- No UPDATE or DELETE policies on audit_log — append-only enforced

-- ============================================================
-- PREVENT audit_log modifications (belt-and-suspenders)
-- ============================================================
CREATE OR REPLACE FUNCTION public.deny_audit_log_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only — modifications are not permitted';
END;
$$;

CREATE TRIGGER audit_log_no_update
  BEFORE UPDATE ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public.deny_audit_log_mutation();

CREATE TRIGGER audit_log_no_delete
  BEFORE DELETE ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public.deny_audit_log_mutation();
