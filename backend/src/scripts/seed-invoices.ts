import prisma from "../prisma/client";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

async function main() {
  console.log("🌱 Seeding suppliers, invoices & documents...");

  // Nettoyage (dev)
  await prisma.document.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.supplier.deleteMany();

  // Fournisseurs
  await prisma.supplier.createMany({
    data: [
      { name: "EDF" },
      { name: "Orange" },
      { name: "Amazon Business" },
      { name: "Google Cloud" },
      { name: "SNCF Connect" },
    ],
  });

  const suppliers = await prisma.supplier.findMany();
  const statuses = ["PAID", "PENDING", "OVERDUE"] as const;

  for (let i = 1; i <= 10; i++) {
    const supplier = suppliers[i % suppliers.length];
    const status = statuses[i % statuses.length];

    // Montants réalistes
    const amountHT = round2(Math.random() * 1500 + 100); // 100 -> 1600
    const amountTVA = round2(amountHT * 0.2); // TVA 20%
    const amountTTC = round2(amountHT + amountTVA);

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: `FAC-2026-${String(i).padStart(3, "0")}`, // unique
        supplierId: supplier.id,
        invoiceDate: new Date(2026, 0, i),
        dueDate: new Date(2026, 0, i + 30),
        amountHT,
        amountTVA,
        amountTTC,
        status,
      },
    });

    // 0 à 3 documents par facture
    const docsCount = i % 4;
    for (let d = 1; d <= docsCount; d++) {
      await prisma.document.create({
        data: {
          invoiceId: invoice.id,
          type: "PDF",
          url: `https://fake-cloud.local/invoices/${invoice.id}/doc-${d}.pdf`,
        },
      });
    }
  }

  console.log("✅ Seed terminé : 5 fournisseurs, 10 factures, documents associés.");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
