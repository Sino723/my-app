-- CreateTable
CREATE TABLE "Task" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "deadline" TIMESTAMP(3),
    "weight" INTEGER NOT NULL,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "from_template_id" INTEGER,
    "parent_id" INTEGER,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchedulePattern" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "morning_start" TEXT NOT NULL,
    "morning_end" TEXT NOT NULL,
    "afternoon_start" TEXT NOT NULL,
    "afternoon_end" TEXT NOT NULL,
    "evening_start" TEXT NOT NULL,
    "evening_end" TEXT NOT NULL,

    CONSTRAINT "SchedulePattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklySchedule" (
    "day_of_week" INTEGER NOT NULL,
    "pattern_id" INTEGER NOT NULL,

    CONSTRAINT "WeeklySchedule_pkey" PRIMARY KEY ("day_of_week")
);

-- CreateTable
CREATE TABLE "Template" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "default_weight" INTEGER NOT NULL,
    "category" TEXT NOT NULL,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklySchedule" ADD CONSTRAINT "WeeklySchedule_pattern_id_fkey" FOREIGN KEY ("pattern_id") REFERENCES "SchedulePattern"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
