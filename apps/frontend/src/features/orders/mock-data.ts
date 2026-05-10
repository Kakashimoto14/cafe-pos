import type { MenuProduct } from "@cafe/shared-types";

export const mockProducts: MenuProduct[] = [
  {
    id: "p-espresso",
    sku: "BEV-001",
    name: "Double Espresso",
    description: "Dense crema, bright citrus finish.",
    categoryId: "coffee",
    price: 120,
    category: "Coffee",
    imageUrl: "https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=500&q=80",
    stockQuantity: 20,
    tags: ["best seller", "hot"],
    isActive: true
  },
  {
    id: "p-latte",
    sku: "BEV-002",
    name: "Sea Salt Latte",
    description: "Silky milk, caramel edge, sea salt foam.",
    categoryId: "signature",
    price: 185,
    category: "Signature",
    imageUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=500&q=80",
    stockQuantity: 18,
    tags: ["signature", "iced"],
    isActive: true
  },
  {
    id: "p-matcha",
    sku: "BEV-003",
    name: "Ceremonial Matcha",
    description: "Premium grade matcha over cold oat milk.",
    categoryId: "tea",
    price: 210,
    category: "Tea",
    imageUrl: "https://images.unsplash.com/photo-1515823662972-da6a2e4d3002?auto=format&fit=crop&w=500&q=80",
    stockQuantity: 14,
    tags: ["new", "iced"],
    isActive: true
  },
  {
    id: "p-croissant",
    sku: "FOOD-101",
    name: "Butter Croissant",
    description: "Layered, flaky, and all-day reliable.",
    categoryId: "pastries",
    price: 140,
    category: "Pastries",
    imageUrl: "https://images.unsplash.com/photo-1555507036-ab794f4ade0a?auto=format&fit=crop&w=500&q=80",
    stockQuantity: 12,
    tags: ["bakery"],
    isActive: true
  }
];
