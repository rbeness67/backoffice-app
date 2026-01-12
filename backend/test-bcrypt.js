const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const email = "rayane@test.com";
  const password = "Rayane2406!";

  const user = await prisma.user.findUnique({
    where: { email },
  });

  console.log("user exists:", !!user);

  if (user) {
    const ok = await bcrypt.compare(password, user.password);
    console.log("compare:", ok);
  }

  await prisma.$disconnect();
}

main().catch(console.error);

