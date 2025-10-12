export interface LoggedIn {
  loggedIn: boolean;
}

export interface ProductPayload {
  id: string;
  name: string;
  desc: string;
  variants: { measurement: string; price: number; size: number }[];
  images: string[];
}

export interface Product {
  items: ProductPayload[];
}
