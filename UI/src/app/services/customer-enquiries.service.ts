// src/app/services/product.service.ts
import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { environment } from "../../environments/environment";

@Injectable({
  providedIn: "root",
})
export class CustomerEnquiriesService {
  private http = inject(HttpClient);

  getEnquiriesList() {
    return this.http.get(`${environment.apiURL}/enquiries-list`);
  }
}
