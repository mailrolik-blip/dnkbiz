-- CreateTable
CREATE TABLE "SchoolTraining" (
    "training_id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "training_type" TEXT NOT NULL,
    "city_id" INTEGER NOT NULL,
    "trainer_id" INTEGER NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolTraining_pkey" PRIMARY KEY ("training_id")
);
