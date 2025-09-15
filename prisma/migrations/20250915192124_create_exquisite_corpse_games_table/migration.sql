-- CreateTable
CREATE TABLE "public"."exquisite_corpse_games" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "exquisite_corpse_games_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "exquisite_corpse_games_uuid_key" ON "public"."exquisite_corpse_games"("uuid");

-- CreateIndex
CREATE INDEX "exquisite_corpse_games_data_idx" ON "public"."exquisite_corpse_games" USING GIN ("data");
