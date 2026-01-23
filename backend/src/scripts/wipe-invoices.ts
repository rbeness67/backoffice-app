import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Nettoyage des factures (invoices + documents)…");

  // ⚠️ ordre IMPORTANT à cause des relations
  const deletedDocuments = await prisma.document.deleteMany({});
  console.log(`✅ Documents supprimés : ${deletedDocuments.count}`);

  const deletedInvoices = await prisma.invoice.deleteMany({});
  console.log(`✅ Invoices supprimées : ${deletedInvoices.count}`);

  console.log("🎉 Base invoices propre.");
}

main()
  .catch((e) => {
    console.error("❌ Erreur pendant le wipe :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
