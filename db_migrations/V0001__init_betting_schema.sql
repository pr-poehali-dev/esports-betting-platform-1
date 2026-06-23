CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(64) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(16) NOT NULL DEFAULT 'user',
    is_banned BOOLEAN NOT NULL DEFAULT FALSE,
    balance NUMERIC(14,2) NOT NULL DEFAULT 1000.00,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS matches (
    id SERIAL PRIMARY KEY,
    discipline VARCHAR(32) NOT NULL,
    tournament VARCHAR(128) NOT NULL,
    team1 VARCHAR(64) NOT NULL,
    team2 VARCHAR(64) NOT NULL,
    odds1 NUMERIC(6,2) NOT NULL,
    odds2 NUMERIC(6,2) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'upcoming',
    winner SMALLINT,
    starts_at TIMESTAMP NOT NULL DEFAULT now(),
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    match_id INTEGER NOT NULL REFERENCES matches(id),
    pick SMALLINT NOT NULL,
    amount NUMERIC(14,2) NOT NULL,
    odds NUMERIC(6,2) NOT NULL,
    potential_win NUMERIC(14,2) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'open',
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    type VARCHAR(24) NOT NULL,
    amount NUMERIC(14,2) NOT NULL,
    balance_after NUMERIC(14,2) NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bets_user ON bets(user_id);
CREATE INDEX IF NOT EXISTS idx_tx_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);

INSERT INTO matches (discipline, tournament, team1, team2, odds1, odds2, status) VALUES
('CS2', 'ESL Pro League', 'FaZe Clan', 'Vitality', 2.10, 1.72, 'upcoming'),
('Dota 2', 'DreamLeague', 'Gaimin Gladiators', 'OG', 1.80, 2.00, 'upcoming'),
('Valorant', 'VCT Masters', 'Fnatic', 'Sentinels', 1.65, 2.25, 'upcoming'),
('LoL', 'LEC Summer', 'G2 Esports', 'Fnatic', 1.55, 2.45, 'upcoming'),
('CS2', 'IEM Katowice', 'NAVI', 'G2 Esports', 1.74, 2.08, 'live'),
('R6', 'Six Invitational', 'Team BDS', 'w7m', 1.40, 2.85, 'upcoming');