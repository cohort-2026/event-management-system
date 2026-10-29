CREATE TABLE IF NOT EXISTS "password_setup_tokens" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_setup_tokens_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "password_setup_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "password_setup_tokens_token_hash_key" ON "password_setup_tokens"("token_hash");
CREATE UNIQUE INDEX IF NOT EXISTS "password_setup_tokens_user_id_key" ON "password_setup_tokens"("user_id");
