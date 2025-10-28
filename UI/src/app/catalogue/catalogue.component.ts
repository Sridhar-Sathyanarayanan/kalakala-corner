import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ProductService } from "../services/product.service";
import { MaterialStandaloneModules } from "../shared/material-standalone";
import { AppService } from "../services/app.service";
import {
  allowedCategories,
  categories,
  Product,
  ProductPayload,
} from "../models/app.model";
import { MatDialog } from "@angular/material/dialog";
import { ProductDetailsComponent } from "./product-details/product-details.component";
import { ConfirmationModalComponent } from "../shared/confirmation/confirmation-modal.component";
import { ActivatedRoute, Router } from "@angular/router";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { firstValueFrom } from "rxjs";

@Component({
  selector: "app-catalogue",
  standalone: true,
  templateUrl: "./catalogue.component.html",
  styleUrls: ["./catalogue.component.scss"],
  imports: [CommonModule, MaterialStandaloneModules],
})
export class CatalogueComponent implements OnInit {
  products = [];
  category: string;
  categoryTitle = "";
  constructor(
    private productService: ProductService,
    public appService: AppService,
    private dialog: MatDialog,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.category = params.get("category");
      if (!this.category || !allowedCategories.includes(this.category)) {
        this.router.navigate(["/catalogue/all"]);
        return;
      }
      this.categoryTitle =
        categories.find((c) => c.slug === this.category)?.name || "All Items";
      this.getProductsList(this.category);
    });
  }

  getProductsList(category?: string) {
    this.products = [];
    this.productService.getProducts(category).subscribe((data: Product) => {
      this.products = data.items;
      this.products.forEach((p) => {
        const priceList = Array.isArray(p.variants)
          ? p.variants.map((i) => Number(i.price)).filter((f) => !isNaN(f))
          : [];
        if (priceList.length) {
          p.minPrice = Math.min(...priceList);
          p.maxPrice = Math.max(...priceList);
        }
      });
    });
  }

  waitForImagesToLoad(container: HTMLElement): Promise<void> {
    const images = Array.from(container.querySelectorAll("img"));
    const promises = images.map((img) => {
      if (img.complete && img.naturalHeight !== 0) {
        return Promise.resolve();
      }
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve(); // resolve even if image fails
      });
    });
    return Promise.all(promises).then(() => {});
  }

  downloadPDF(): void {
    this.productService.downloadPDF().subscribe(async (data) => {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const margin = 15,
        imageWidth = 50,
        imageHeight = 40;
      let y = 40;

      // Header
      doc.setFontSize(16);
      doc.text("Products Catalog", doc.internal.pageSize.getWidth() / 2, 15, {
        align: "center",
      });

      for (const item of data.items) {
        // If not enough space left, add a new page
        if (y + imageHeight + 30 > doc.internal.pageSize.getHeight() - margin) {
          doc.addPage();
          y = margin;
        }

        // Draw card border
        doc.setDrawColor(180);
        doc.roundedRect(
          margin,
          y,
          doc.internal.pageSize.getWidth() - 2 * margin,
          imageHeight + 30,
          4,
          4
        );

        // Product Name (bold)
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.text(item.name, margin + imageWidth + 10, y + 10);

        // Description
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        const descLines = doc.splitTextToSize(
          item.desc,
          doc.internal.pageSize.getWidth() - (margin + imageWidth + 15)
        );
        doc.text(descLines, margin + imageWidth + 10, y + 18);

        // Variants Table
        autoTable(doc, {
          startY: y + imageHeight - 2,
          margin: { left: margin + imageWidth + 10 },
          head: [["Size", "Price"]],
          body: item.variants.map((v: any) => [v.size, `₹${v.price}`]),
          styles: { fontSize: 9, cellPadding: 2 },
          headStyles: {
            fillColor: [66, 139, 202],
            textColor: 255,
            fontSize: 9,
            fontStyle: "bold",
          },
          columnStyles: {
            0: { cellWidth: 20 },
            1: { cellWidth: 25 },
            2: { cellWidth: 25 },
          },
          theme: "grid",
          didDrawCell: (data) => {},
        });

        // Add S3 Image (left side)
        if (item.images && item.images.length > 0) {
          try {
            const imgData = await this.toBase64(item.images[0]);
            doc.addImage(
              imgData,
              "JPEG",
              margin + 5,
              y + 5,
              imageWidth,
              imageHeight,
              undefined,
              "FAST"
            );
          } catch (e) {
            // Draw placeholder if image fails
            doc.setFillColor(230, 230, 230);
            doc.rect(margin + 5, y + 5, imageWidth, imageHeight, "F");
            doc.setTextColor(150, 150, 150);
            doc.setFontSize(8);
            doc.text("Image not\navailable", margin + 10, y + imageHeight / 2);
          }
        }

        y += imageHeight + 45; // Spacing for next card
      }

      doc.save("products-catalog.pdf");
    });
  }

  // Utility: Convert image URL to base64 string
  private async toBase64(input: string | Blob): Promise<string> {
    let blob: Blob;
    if (typeof input === "string") {
      // Prefer fetching via server proxy which returns a blob
      try {
        blob = await firstValueFrom(this.productService.fetchS3Image(input));
      } catch (err) {
        // Fallback to client fetch if server proxy fails
        const res = await fetch(input, { mode: "cors" });
        blob = await res.blob();
      }
    } else {
      blob = input;
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  openProductModal(product: ProductPayload) {
    this.dialog.open(ProductDetailsComponent, {
      data: product,
      width: "95%",
      maxWidth: "900px",
      maxHeight: "90vh",
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
        button: "Delete",
      },
      width: "85%",
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.productService.deleteProduct(product.id).subscribe(() => {
          this.getProductsList(this.category);
        });
      }
    });
  }
}
