import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ProductService } from "../services/product.service";
import { MaterialStandaloneModules } from "../shared/material-standalone";
import { AppService } from "../services/app.service";
import { Product, ProductPayload } from "../models/app.model";
import { MatDialog } from "@angular/material/dialog";
import { ProductDetailsComponent } from "./product-details/product-details.component";
import { ConfirmationModalComponent } from "../shared/confirmation-modal.component";
import { Router } from "@angular/router";

@Component({
  selector: "app-catalogue",
  standalone: true,
  templateUrl: "./catalogue.component.html",
  styleUrls: ["./catalogue.component.scss"],
  imports: [CommonModule, MaterialStandaloneModules],
})
export class CatalogueComponent implements OnInit {
  products = [];

  constructor(
    private productService: ProductService,
    public appService: AppService,
    private dialog: MatDialog,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.productService.getProducts().subscribe((data: Product) => {
      this.products = data.items;
      this.products.forEach((p) => {
        p.minPrice = Math.min(...p.variants.map((i) => i.price));
        p.maxPrice = Math.max(...p.variants.map((i) => i.price));
      });
    });
  }
  openProductModal(product: ProductPayload) {
    this.dialog.open(ProductDetailsComponent, {
      data: product,
      width: "95%",
      maxWidth: "900px",
    });
  }
  edit(product: ProductPayload) {
    this.router.navigate(["/edit-product", product.id]);
  }
  delete(product: ProductPayload) {
    const dialogRef = this.dialog.open(ConfirmationModalComponent, {
      data: {
        message:
          "Are you sure you want to delete the product? (Note: This will permanently delete the product from databae)",
      },
      width: "85%",
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.productService.deleteProduct(product.id).subscribe((res) => {});
      }
    });
  }
}
