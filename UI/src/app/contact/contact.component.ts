import { Component } from "@angular/core";
import { MaterialStandaloneModules } from "../shared/material-standalone";

@Component({
  selector: "app-contact",
  templateUrl: "./contact.component.html",
  styleUrls: ["./contact.component.scss"],
  imports: [MaterialStandaloneModules],
})
export class ContactComponent {
  email = "rsk.sudha@gmail.com";
  phone = "+91 7669990988";
  location = "New Delhi, India";
  instagram = "kalakalacorner";
  copiedText = "";

  async copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      this.showCopied(label);
    } catch {
      this.showCopied(label);
    }
  }

  private showCopied(label: string) {
    this.copiedText = label;
    setTimeout(() => (this.copiedText = ""), 1600);
  }
}
