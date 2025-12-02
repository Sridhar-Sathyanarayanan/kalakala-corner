export interface LoggedIn {
  loggedIn: boolean;
}

export interface ProductPayload {
  id: string;
  name: string;
  desc: string;
  variants: { price: number; size: number; discountedPrice: number }[];
  notes: string[];
  category: string;
  images: string[];
}

export interface Product {
  items: ProductPayload[];
}

export interface CategoryPayload {
  path: string;
  name: string;
}
export interface Category {
  items: CategoryPayload[];
}

export interface Customerenquiry {
  date: Date;
  name: string;
  phone: string;
  email: string;
  product: string;
  query: string;
}

export interface Testimonial {
  id: number;
  category: string;
  product: string;
  "product-id": string;
  comments: string;
  rating: number;
  customerName?: string;
  updatedAt: string;
}

export interface TestimonialResponse {
  items: Testimonial[];
}

export const personalDetails = [
  {
    title: "Email",
    value: "rsk.sudha@gmail.com",
    href: "mailto:rsk.sudha@gmail.com",
    icon: "mail.svg",
  },
  {
    title: "Phone",
    value: "+91 7669990988",
    href: "tel:+917669990988",
    icon: "phone.svg",
  },
  { title: "Location", value: "New Delhi, India", icon: "location.svg" },
  {
    title: "Instagram",
    value: "kalakalacorner",
    href: "https://www.instagram.com/kalakalacorner",
    icon: "instagram.svg",
  },
];

export const emojis = [
  "💕",
  "💖",
  "💗",
  "💘",
  "💙",
  "💚",
  "💛",
  "💜",
  "💝",
  "💛",
];

export interface ProductWithPricing extends ProductPayload {
  displayMinPrice?: number;
  displayMaxPrice?: number;
  originalMinPrice?: number;
  originalMaxPrice?: number;
  maxDiscountPercent?: number;
  hasDiscount?: boolean;
}