-- ローカル (ラズパイ) 稼働用の SQLite スキーマ。
-- Azure Table Storage の PartitionKey (= userId) / RowKey (= エンティティID) を
-- そのまま user_id / id にマッピングしている。

CREATE TABLE IF NOT EXISTS accounts (
  user_id    TEXT    NOT NULL,
  id         TEXT    NOT NULL,
  name       TEXT    NOT NULL DEFAULT '',
  balance    NUMERIC NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL DEFAULT '',
  updated_at TEXT    NOT NULL DEFAULT '',
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS credit_cards (
  user_id    TEXT NOT NULL,
  id         TEXT NOT NULL,
  name       TEXT NOT NULL DEFAULT '',
  account_id TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS fixed_payments (
  user_id      TEXT    NOT NULL,
  id           TEXT    NOT NULL,
  name         TEXT    NOT NULL DEFAULT '',
  amount       NUMERIC NOT NULL DEFAULT 0,
  account_id   TEXT    NOT NULL DEFAULT '',
  bonus_months TEXT    NOT NULL DEFAULT '',
  bonus_amount NUMERIC NOT NULL DEFAULT 0,
  created_at   TEXT    NOT NULL DEFAULT '',
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS monthly_records (
  user_id     TEXT    NOT NULL,
  id          TEXT    NOT NULL,
  record_type TEXT    NOT NULL DEFAULT '',
  target_id   TEXT    NOT NULL DEFAULT '',
  amount      NUMERIC NOT NULL DEFAULT 0,
  year_month  TEXT    NOT NULL DEFAULT '',
  PRIMARY KEY (user_id, id)
);

-- 口座削除時のカスケード検索 (accountId eq ...) 用。
CREATE INDEX IF NOT EXISTS idx_fixed_payments_account
  ON fixed_payments (user_id, account_id);
CREATE INDEX IF NOT EXISTS idx_credit_cards_account
  ON credit_cards (user_id, account_id);
