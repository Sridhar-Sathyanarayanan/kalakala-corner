import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ProductService } from "../services/product.service";
import { MaterialStandaloneModules } from "../shared/material-standalone";

@Component({
  selector: "app-catalogue",
  standalone: true,
  templateUrl: "./catalogue.component.html",
  styleUrls: ["./catalogue.component.scss"],
  imports: [CommonModule, MaterialStandaloneModules],
})
export class CatalogueComponent implements OnInit {
  products = [];

  modalImageUrl: string | null = null;

  constructor(private productService: ProductService) {}

  ngOnInit(): void {
    this.productService.getProducts().subscribe((data) => {
      this.products = data["items"];
    });
  }

  openModal(imageUrl: string) {
    this.modalImageUrl = imageUrl;
  }

  closeModal() {
    this.modalImageUrl = null;
  }

  /** Helper: return array of 1/0 for filled/unfilled stars */
  getStars(rating: number): number[] {
    return Array(5)
      .fill(0)
      .map((_, i) => (i < Math.round(rating) ? 1 : 0));
  }
}
