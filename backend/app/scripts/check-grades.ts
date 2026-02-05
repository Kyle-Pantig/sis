
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const failedCount = await prisma.grade.count({
        where: { remarks: "Failed" }
    });
    console.log("Failed grades count:", failedCount);

    const passedCount = await prisma.grade.count({
        where: { remarks: "Passed" }
    });
    console.log("Passed grades count:", passedCount);
    
    const allCount = await prisma.grade.count();
    console.log("Total grades count:", allCount);
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
