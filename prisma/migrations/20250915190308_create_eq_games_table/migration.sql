-- CreateTable
CREATE TABLE "public"."eq_games" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "eq_games_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "eq_games_uuid_key" ON "public"."eq_games"("uuid");

-- CreateIndex
CREATE INDEX "eq_games_data_idx" ON "public"."eq_games" USING GIN ("data");
