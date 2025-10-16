export interface LoggedIn {
  loggedIn: boolean;
}

export interface ProductPayload {
  id: string;
  name: string;
  desc: string;
  variants: { measurement: string; price: number; size: number }[];
  notes: string[];
  category: string;
  images: string[];
}

export interface Product {
  items: ProductPayload[];
}

export const allowedCategories = [
  "all",
  "handicrafts",
  "eco-wooden",
  "wooden",
  "wooden-utility",
  "wooden-pooja",
  "kids-eco-wooden",
  "thanjavur-paintings",
  "thanjavur-art-plates",
];

export const categories = [
  { name: "Handicrafts items", slug: "handicrafts" },
  { name: "Eco-friendly wooden gift items", slug: "eco-wooden" },
  { name: "Wooden Themes gifts", slug: "wooden" },
  { name: "Wooden utility articles", slug: "wooden-utility" },
  { name: "Wooden pooja items", slug: "wooden-pooja" },
  { name: "Kids centre - eco friendly wooden toys", slug: "kids-eco-wooden" },
  { name: "Traditional Thanjavur Paintings", slug: "thanjavur-paintings" },
  { name: "Traditional Thanjavur Art Plates", slug: "thanjavur-art-plates" },
];
