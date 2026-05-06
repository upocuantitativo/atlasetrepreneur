-- Schema for the Method Atlas (database u262522767_atlas).
-- Run once on first install (api.php?action=init does this idempotently).

CREATE TABLE IF NOT EXISTS sectors (
  id              VARCHAR(32)  NOT NULL PRIMARY KEY,
  label           VARCHAR(255) NOT NULL,
  sub             VARCHAR(255) NOT NULL,
  angle           FLOAT        NOT NULL,
  hue             INT          NOT NULL,
  goal            TEXT,
  description     TEXT,
  techniques      JSON,        -- array of strings
  hypotheses      JSON,        -- array of strings
  conditions      JSON,        -- array of strings
  assumes         JSON,        -- array of strings
  procedure_steps JSON,        -- array of strings
  software        JSON,        -- array of strings
  authors         JSON,        -- array of {name, work, url, why}
  key_refs        JSON,        -- array of strings
  chat_hints      JSON,        -- array of strings
  display_order   INT NOT NULL DEFAULT 0,
  updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rings (
  id            VARCHAR(32)  NOT NULL PRIMARY KEY,
  label         VARCHAR(120) NOT NULL,
  sub           VARCHAR(255),
  r_norm        FLOAT        NOT NULL,
  display_order INT          NOT NULL DEFAULT 0
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS questions (
  id            VARCHAR(48)  NOT NULL PRIMARY KEY,
  ring_index    INT          NOT NULL DEFAULT 0,
  question_text TEXT         NOT NULL,
  hint          TEXT,
  always_show   TINYINT(1)   NOT NULL DEFAULT 1,
  multi_select  TINYINT(1)   NOT NULL DEFAULT 0,   -- 0 = single answer, 1 = several
  show_if       JSON,        -- {type:'leaderIs',id:...} | {type:'topThreeIncludes',ids:[...]} | {type:'topThreeIncludesAll',ids:[...]} | {type:'tieBreak'} | null
  display_order INT          NOT NULL DEFAULT 0,
  updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS options (
  id            INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  question_id   VARCHAR(48)  NOT NULL,
  label         TEXT         NOT NULL,
  weights       JSON,        -- { sector_id: int, ... } -- intensity per technique
  display_order INT          NOT NULL DEFAULT 0,
  KEY ix_options_question (question_id)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
