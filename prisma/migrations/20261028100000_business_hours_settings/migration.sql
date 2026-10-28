CREATE TABLE "business_hours_settings" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "allowed_days" INTEGER[] NOT NULL DEFAULT ARRAY[1, 2, 3, 4, 5],
    "open_hour" INTEGER NOT NULL DEFAULT 8,
    "close_hour" INTEGER NOT NULL DEFAULT 18,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "business_hours_settings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "business_hours_settings_hours_check" CHECK (
        "open_hour" >= 0 AND "open_hour" <= 23 AND
        "close_hour" >= 0 AND "close_hour" <= 23 AND
        "close_hour" > "open_hour"
    ),
    CONSTRAINT "business_hours_settings_allowed_days_check" CHECK (
        "allowed_days" <@ ARRAY[0, 1, 2, 3, 4, 5, 6]
    )
);