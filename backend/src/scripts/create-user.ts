import prisma from "../prisma/client";
import bcrypt from "bcrypt";

async function main() {
  const password = await bcrypt.hash("Rayane2406!", 10);

  await prisma.user.create({
    data: {
      email: "rayane@test.com",
      password,
      role: "ADMIN",
    },
  });

  console.log("User created");
}

main();
