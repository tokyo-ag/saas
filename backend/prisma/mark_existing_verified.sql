UPDATE organizer_accounts SET email_verified_at = NOW() WHERE password_hash IS NOT NULL AND email_verified_at IS NULL;
