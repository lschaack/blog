-- CreateTable
CREATE TABLE "public"."exquisite_corpse_training_examples" (
    "id" UUID NOT NULL,
    "paths" JSONB NOT NULL,
    "sketch_description" TEXT NOT NULL,
    "turn_description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exquisite_corpse_training_examples_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."exquisite_corpse_tags" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "exquisite_corpse_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."exquisite_corpse_training_example_tags" (
    "example_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,

    CONSTRAINT "exquisite_corpse_training_example_tags_pkey" PRIMARY KEY ("example_id","tag_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "exquisite_corpse_tags_name_key" ON "public"."exquisite_corpse_tags"("name");

-- AddForeignKey
ALTER TABLE "public"."exquisite_corpse_training_example_tags" ADD CONSTRAINT "exquisite_corpse_training_example_tags_example_id_fkey" FOREIGN KEY ("example_id") REFERENCES "public"."exquisite_corpse_training_examples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."exquisite_corpse_training_example_tags" ADD CONSTRAINT "exquisite_corpse_training_example_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."exquisite_corpse_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
