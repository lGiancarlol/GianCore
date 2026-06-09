import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ── Owner user ─────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("GianCore2025!", 12);

  const owner = await prisma.user.upsert({
    where:  { email: "admin@giancore.io" },
    update: {},
    create: {
      email:        "admin@giancore.io",
      username:     "owner",
      passwordHash,
      role:         "owner",
      active:       true,
    },
  });
  console.log(`✓ Owner user: ${owner.email}`);

  // ── Owner wallet ───────────────────────────────────────────────────────────
  await prisma.wallet.upsert({
    where:  { userId: owner.id },
    update: {},
    create: { userId: owner.id, balance: 0 },
  });

  // ── System user ────────────────────────────────────────────────────────────
  await prisma.user.upsert({
    where:  { email: "system@giancore.internal" },
    update: {},
    create: {
      email:        "system@giancore.internal",
      username:     "system",
      passwordHash: "",
      role:         "owner",
      active:       true,
    },
  });
  console.log("✓ System user");

  // ── Sample products ────────────────────────────────────────────────────────
  const products = [
    { name: "Free Fire 1 Hora", slug: "ff-1h",  description: "Licencia Free Fire 1 hora",  price: 10 },
    { name: "Free Fire 1 Día",  slug: "ff-1d",  description: "Licencia Free Fire 1 día",   price: 50 },
    { name: "VPN Premium",      slug: "vpn",    description: "Acceso VPN premium",         price: 20 },
    { name: "iOS Unlock",       slug: "ios",    description: "Licencia iOS unlock",        price: 30 },
  ];

  for (const p of products) {
    const product = await prisma.product.upsert({
      where:  { slug: p.slug },
      update: {},
      create: { ...p, active: true },
    });
    console.log(`✓ Product: ${product.name}`);
  }

  // ── Base settings ──────────────────────────────────────────────────────────
  await prisma.setting.upsert({
    where:  { key: "platform_name" },
    update: {},
    create: { key: "platform_name", value: "GianCore" },
  });

  console.log("\n✅ Seed completed.");
  console.log("   Login: admin@giancore.io / GianCore2025!");
  console.log("   ⚠  Change the password immediately after first login.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
