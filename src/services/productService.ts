import { prisma } from "@/lib/prisma";

export async function getProducts() {
  return prisma.product.findMany({ orderBy: { createdAt: "desc" } });
}

export async function getProductBySlug(slug: string) {
  return prisma.product.findUnique({ where: { slug } });
}

export async function createProduct(data: {
  name: string;
  slug: string;
  description?: string;
  price?: number;
}) {
  return prisma.product.create({ data });
}

export async function toggleProductStatus(id: string, active: boolean) {
  return prisma.product.update({ where: { id }, data: { active } });
}
