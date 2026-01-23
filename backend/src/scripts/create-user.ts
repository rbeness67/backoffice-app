import prisma from "../prisma/client";
import bcrypt from "bcrypt";

async function main() {
  const password = await bcrypt.hash("Ma120692!!", 10);

  await prisma.user.create({
    data: {
      email: "lauramart@live.fr",
      password,
      role: "ADMIN",
    },
  });

  console.log("User created");
}

main();
