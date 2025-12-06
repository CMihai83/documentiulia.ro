-- ============================================
-- Migration: i18n System
-- Multi-language translation support
-- ============================================

-- Translations table for database-stored translations
CREATE TABLE IF NOT EXISTS translations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    language_code VARCHAR(5) NOT NULL,
    namespace VARCHAR(50) NOT NULL DEFAULT 'common',
    translation_key VARCHAR(200) NOT NULL,
    translation_value TEXT NOT NULL,
    context TEXT,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(language_code, namespace, translation_key)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_translations_lookup
ON translations(language_code, namespace);

-- User language preferences
CREATE TABLE IF NOT EXISTS user_language_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    preferred_language VARCHAR(5) NOT NULL DEFAULT 'ro',
    date_format VARCHAR(20) DEFAULT 'DD.MM.YYYY',
    time_format VARCHAR(20) DEFAULT 'HH:mm',
    currency VARCHAR(3) DEFAULT 'RON',
    timezone VARCHAR(50) DEFAULT 'Europe/Bucharest',
    number_format VARCHAR(10) DEFAULT 'eu',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Company language settings
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS default_language VARCHAR(5) DEFAULT 'ro',
ADD COLUMN IF NOT EXISTS supported_languages JSONB DEFAULT '["ro", "en"]',
ADD COLUMN IF NOT EXISTS default_currency VARCHAR(3) DEFAULT 'RON',
ADD COLUMN IF NOT EXISTS default_timezone VARCHAR(50) DEFAULT 'Europe/Bucharest';

-- Translation audit log
CREATE TABLE IF NOT EXISTS translation_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    translation_id UUID REFERENCES translations(id) ON DELETE SET NULL,
    action VARCHAR(20) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_translation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for translations
DROP TRIGGER IF EXISTS trigger_translations_updated ON translations;
CREATE TRIGGER trigger_translations_updated
    BEFORE UPDATE ON translations
    FOR EACH ROW
    EXECUTE FUNCTION update_translation_timestamp();

-- Trigger for user language preferences
DROP TRIGGER IF EXISTS trigger_user_lang_prefs_updated ON user_language_preferences;
CREATE TRIGGER trigger_user_lang_prefs_updated
    BEFORE UPDATE ON user_language_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_translation_timestamp();

-- Insert some critical UI translations
INSERT INTO translations (language_code, namespace, translation_key, translation_value, is_verified) VALUES
-- Romanian Common
('ro', 'common', 'save', 'Salvează', true),
('ro', 'common', 'cancel', 'Anulează', true),
('ro', 'common', 'delete', 'Șterge', true),
('ro', 'common', 'edit', 'Editează', true),
('ro', 'common', 'create', 'Creează', true),
('ro', 'common', 'search', 'Caută', true),
('ro', 'common', 'filter', 'Filtrează', true),
('ro', 'common', 'loading', 'Se încarcă...', true),
('ro', 'common', 'error', 'Eroare', true),
('ro', 'common', 'success', 'Succes', true),
('ro', 'common', 'confirm', 'Confirmă', true),
('ro', 'common', 'back', 'Înapoi', true),
('ro', 'common', 'next', 'Următorul', true),
('ro', 'common', 'previous', 'Anterior', true),
('ro', 'common', 'close', 'Închide', true),
('ro', 'common', 'yes', 'Da', true),
('ro', 'common', 'no', 'Nu', true),

-- English Common
('en', 'common', 'save', 'Save', true),
('en', 'common', 'cancel', 'Cancel', true),
('en', 'common', 'delete', 'Delete', true),
('en', 'common', 'edit', 'Edit', true),
('en', 'common', 'create', 'Create', true),
('en', 'common', 'search', 'Search', true),
('en', 'common', 'filter', 'Filter', true),
('en', 'common', 'loading', 'Loading...', true),
('en', 'common', 'error', 'Error', true),
('en', 'common', 'success', 'Success', true),
('en', 'common', 'confirm', 'Confirm', true),
('en', 'common', 'back', 'Back', true),
('en', 'common', 'next', 'Next', true),
('en', 'common', 'previous', 'Previous', true),
('en', 'common', 'close', 'Close', true),
('en', 'common', 'yes', 'Yes', true),
('en', 'common', 'no', 'No', true),

-- Romanian Navigation
('ro', 'nav', 'dashboard', 'Panou de Control', true),
('ro', 'nav', 'invoices', 'Facturi', true),
('ro', 'nav', 'expenses', 'Cheltuieli', true),
('ro', 'nav', 'contacts', 'Contacte', true),
('ro', 'nav', 'projects', 'Proiecte', true),
('ro', 'nav', 'reports', 'Rapoarte', true),
('ro', 'nav', 'settings', 'Setări', true),
('ro', 'nav', 'inventory', 'Inventar', true),
('ro', 'nav', 'employees', 'Angajați', true),
('ro', 'nav', 'accounting', 'Contabilitate', true),

-- English Navigation
('en', 'nav', 'dashboard', 'Dashboard', true),
('en', 'nav', 'invoices', 'Invoices', true),
('en', 'nav', 'expenses', 'Expenses', true),
('en', 'nav', 'contacts', 'Contacts', true),
('en', 'nav', 'projects', 'Projects', true),
('en', 'nav', 'reports', 'Reports', true),
('en', 'nav', 'settings', 'Settings', true),
('en', 'nav', 'inventory', 'Inventory', true),
('en', 'nav', 'employees', 'Employees', true),
('en', 'nav', 'accounting', 'Accounting', true),

-- Romanian Auth
('ro', 'auth', 'login', 'Autentificare', true),
('ro', 'auth', 'logout', 'Deconectare', true),
('ro', 'auth', 'register', 'Înregistrare', true),
('ro', 'auth', 'forgot_password', 'Am uitat parola', true),
('ro', 'auth', 'email', 'Email', true),
('ro', 'auth', 'password', 'Parolă', true),
('ro', 'auth', 'remember_me', 'Ține-mă minte', true),

-- English Auth
('en', 'auth', 'login', 'Login', true),
('en', 'auth', 'logout', 'Logout', true),
('en', 'auth', 'register', 'Register', true),
('en', 'auth', 'forgot_password', 'Forgot Password', true),
('en', 'auth', 'email', 'Email', true),
('en', 'auth', 'password', 'Password', true),
('en', 'auth', 'remember_me', 'Remember Me', true)

ON CONFLICT (language_code, namespace, translation_key) DO NOTHING;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON translations TO accountech_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_language_preferences TO accountech_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON translation_audit TO accountech_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO accountech_app;
