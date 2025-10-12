import { Component, Inject, HostListener } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { CommonModule } from "@angular/common";
import { MaterialStandaloneModules } from "../../shared/material-standalone";

@Component({
  selector: "app-product-details",
  standalone: true,
  imports: [CommonModule, MaterialStandaloneModules],
  templateUrl: "./product-details.component.html",
  styleUrls: ["./product-details.component.scss"],
})
export class ProductDetailsComponent {
  currentIndex = 0;
  
  constructor(
    public dialogRef: MatDialogRef<ProductDetailsComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  nextImage() {
    this.currentIndex = (this.currentIndex + 1) % this.data.images.length;
  }

  prevImage() {
    this.currentIndex =
      (this.currentIndex - 1 + this.data.images.length) %
      this.data.images.length;
  }

  close() {
    this.dialogRef.close();
  }

  // Optional: Support swipe gestures on mobile
  private touchStartX = 0;
  private touchEndX = 0;

  @HostListener("touchstart", ["$event"])
  onTouchStart(event: TouchEvent) {
    this.touchStartX = event.changedTouches[0].screenX;
  }

  @HostListener("touchend", ["$event"])
  onTouchEnd(event: TouchEvent) {
    this.touchEndX = event.changedTouches[0].screenX;
    if (this.touchEndX < this.touchStartX - 40) this.nextImage();
    if (this.touchEndX > this.touchStartX + 40) this.prevImage();
  }
}
