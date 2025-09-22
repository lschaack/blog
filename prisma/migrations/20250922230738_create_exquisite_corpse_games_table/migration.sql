-- CreateTable
CREATE TABLE "public"."exquisite_corpse_games" (
    "id" UUID NOT NULL,
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exquisite_corpse_games_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exquisite_corpse_games_data_idx" ON "public"."exquisite_corpse_games" USING GIN ("data");
