import { Routes } from "@angular/router";
import { PageNotFoundComponent } from "./page-not-found/page-not-found.component";

export const routes: Routes = [
  {
    path: "",
    loadComponent: () =>
      import("./home/home.component").then((m) => m.HomeComponent),
  },
  {
    path: "catalogue",
    redirectTo: "/catalogue/all",
    pathMatch: "full",
  },
  {
    path: "catalogue/:category",
    loadComponent: () =>
      import("./catalogue/catalogue.component").then(
        (m) => m.CatalogueComponent
      ),
  },
  {
    path: "login",
    loadComponent: () =>
      import("./login/login.component").then((m) => m.LoginComponent),
  },
  {
    path: "add-product",
    loadComponent: () =>
      import("./admin/add-product/add-product.component").then(
        (m) => m.AddProductComponent
      ),
  },
  {
    path: "modify-category",
    loadComponent: () =>
      import("./admin/modify-category/modify-category.component").then(
        (m) => m.ModifyCategoryComponent
      ),
  },
  {
    path: "edit-product/:id",
    loadComponent: () =>
      import("./admin/add-product/add-product.component").then(
        (m) => m.AddProductComponent
      ),
  },
  {
    path: "about-us",
    loadComponent: () =>
      import("./about-us/about-us.component").then((m) => m.AboutUsComponent),
  },
  {
    path: "contact",
    loadComponent: () =>
      import("./contact/contact.component").then((m) => m.ContactComponent),
  },
  {
    path: "admin",
    loadComponent: () =>
      import("./admin/admin.component").then((m) => m.AdminComponent),
  },
  { path: "**", component: PageNotFoundComponent },
];
