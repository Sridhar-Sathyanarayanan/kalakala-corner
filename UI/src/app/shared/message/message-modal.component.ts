import { CommonModule } from "@angular/common";
import { Component, Inject } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { MaterialStandaloneModules } from "../../shared/material-standalone";

@Component({
  selector: "app-confirm-dialog",
  standalone: true,
  imports: [CommonModule, MaterialStandaloneModules],
  templateUrl: "./message-modal.component.html",
  styleUrl: "./message-modal.component.scss",
})
export class MessageModalComponent {
  constructor(
    public dialogRef: MatDialogRef<MessageModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { message: string; }
  ) {}

  close(): void {
    this.dialogRef.close(true);
  }
}
