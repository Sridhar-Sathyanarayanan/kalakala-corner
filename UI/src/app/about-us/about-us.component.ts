import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MaterialStandaloneModules } from "../shared/material-standalone";

@Component({
  selector: "app-about-us",
  standalone: true,
  imports: [CommonModule, MaterialStandaloneModules],
  templateUrl: "./about-us.component.html",
  styleUrl: "./about-us.component.scss",
})
export class AboutUsComponent {
  missions = [
    "Spread Art and craft from diverse regions",
    "Support artisans/ craft makers and value their talent",
    "Encourage eco-friendly products such as wooden handicrafts, paintings and artificial flowers",
    "Encourage sustainable and eco-friendly practices",
  ];
  goals = [
    "Promote cultural heritage and traditional art forms",
    "Foster creativity and innovation in art and craft.",
  ];
}
