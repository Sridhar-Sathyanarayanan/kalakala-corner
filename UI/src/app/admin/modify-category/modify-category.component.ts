import { Component, OnInit, inject } from "@angular/core";
import {
  FormArray,
  FormBuilder,
  FormControl,
  Validators,
} from "@angular/forms";
import { MatDialog } from "@angular/material/dialog";
import { MatSnackBar } from "@angular/material/snack-bar";
import { Category, CategoryPayload } from "../../models/app.model";
import { ProductService } from "../../services/product.service";
import { ConfirmationModalComponent } from "../../shared/confirmation/confirmation-modal.component";
import { MaterialStandaloneModules } from "../../shared/material-standalone";
import { MessageModalComponent } from "../../shared/message/message-modal.component";

@Component({
  selector: "app-modify-category",
  templateUrl: "./modify-category.component.html",
  styleUrl: "./modify-category.component.scss",
  standalone: true,
  imports: [MaterialStandaloneModules],
})
export class ModifyCategoryComponent implements OnInit {
  private fb = inject(FormBuilder);
  private productService = inject(ProductService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  categoriesArray: FormArray = this.fb.array([]);
  displayedColumns: string[] = ["added", "modified", "deleted"];

  deletedCategories: { path: string, name:string }[] = [];
  modifiedCategories: { path: string; oldName:string, newName: string }[] = [];
  addedCategories: { name: string }[] = [];

  constructor() {}

  ngOnInit(): void {
    this.loadCategories();
  }

  /** Helper to cast AbstractControl to FormControl for template binding */
  getControl(cat: any, field: string): FormControl {
    return cat.get(field) as FormControl;
  }

  /** Load categories from backend */
  loadCategories(): void {
    this.productService.getCategories().subscribe((data: Category) => {
      data.items.forEach((item: CategoryPayload) => {
        this.categoriesArray.push(
          this.fb.group({
            path: [item.path], // Primary key (hidden from UI)
            name: [item.name, [Validators.required, Validators.maxLength(100)]],
            originalName: [item.name],
            isEditing: [false],
            isDeleted: [false],
            isNew: [false],
          })
        );
      });
      this.updateSummary();
    });
  }

  /** Add new empty category row */
  addCategory(): void {
    this.categoriesArray.push(
      this.fb.group({
        name: ["", [Validators.required, Validators.maxLength(100)]],
        originalName: [""],
        isEditing: [true],
        isDeleted: [false],
        isNew: [true],
      })
    );
    this.updateSummary();
  }

  /** Toggle edit mode */
  editCategory(index: number): void {
    this.categoriesArray.controls.forEach((ctrl) =>
      ctrl.get("isEditing")?.setValue(false)
    );
    this.categoriesArray.at(index).get("isEditing")?.setValue(true);
    this.updateSummary();
  }

  /** Save edited category */
  saveEdit(index: number): void {
    const control = this.categoriesArray.at(index);
    const name = control.get("name")?.value?.trim();

    if (!name) {
      this.snackBar.open("Category name cannot be empty", "Close", {
        duration: 2000,
      });
      return;
    }

    control.get("isEditing")?.setValue(false);
    this.updateSummary();
  }

  /** Cancel editing */
  cancelEdit(index: number): void {
    const control = this.categoriesArray.at(index);
    if (control.get("isNew")?.value) {
      this.categoriesArray.removeAt(index);
    } else {
      const originalName = control.get("originalName")?.value;
      control.get("name")?.setValue(originalName);
      control.get("isEditing")?.setValue(false);
    }
    this.updateSummary();
  }

  /** Delete category (soft delete until Save) */
  deleteCategory(index: number): void {
    const control = this.categoriesArray.at(index);
    control.get("isDeleted")?.setValue(true);
    control.get("isEditing")?.setValue(false);
    this.updateSummary();
  }

  /** Undo delete */
  undoDelete(index: number): void {
    const control = this.categoriesArray.at(index);
    control.get("isDeleted")?.setValue(false);
    this.updateSummary();
  }

  /** Update summary lists */
  updateSummary(): void {
    this.deletedCategories = [];
    this.modifiedCategories = [];
    this.addedCategories = [];

    this.categoriesArray.controls.forEach((ctrl) => {
      const isDeleted = ctrl.get("isDeleted")?.value;
      const isNew = ctrl.get("isNew")?.value;
      const name = ctrl.get("name")?.value?.trim();
      const originalName = ctrl.get("originalName")?.value;
      const path = ctrl.get("path")?.value;

      if (isDeleted && path) {
        this.deletedCategories.push({ path, name: originalName });
      } else if (!isDeleted && !isNew && path) {
        if (name && name !== originalName) {
          this.modifiedCategories.push({ path, newName: name, oldName: originalName });
        }
      } else if (!isDeleted && isNew && name) {
        this.addedCategories.push({ name });
      }
    });
  }

  /** Save all categories to backend */
  saveCategories(): void {
    const dialogRef = this.dialog.open(ConfirmationModalComponent, {
      data: {
        message:
          "Are you sure you want to Save categories? <br> <br> <strong>Note:</strong> <ul><li>Modifying a category will modify category for all products associated with it.</li><li> Deleting a category will delete all products associated with it.</li></ul>",
        button: "Confirm",
      },
      width: "85%",
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;

      this.updateSummary(); // make sure latest changes are captured

      const payload = {
        deletedCategories: this.deletedCategories,
        modifiedCategories: this.modifiedCategories,
        addedCategories: this.addedCategories,
      };

      this.productService.saveCategories(payload).subscribe({
        next: () => {
          this.dialog.open(MessageModalComponent, {
            data: { message: "Categories updated successfully!" },
            width: "90vw",
            maxWidth: "500px",
          });

          // reload categories
          this.categoriesArray.clear();
          this.loadCategories();
        },
        error: (err) => {
          if (err?.error?.message?.includes?.("No token found")) {
            this.snackBar.open("Please Login", "Close", {
              duration: 3000,
            });
          } else {
            this.snackBar.open("Failed to save categories", "Close", {
              duration: 2000,
            });
          }
          console.error(err);
        },
      });
    });
  }
}
