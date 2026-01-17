// src/app/services/product.service.ts
import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { environment } from "../../environments/environment";
import { map } from "rxjs/operators";
import { CustomerenquiryResponse } from "../models/app.model";

@Injectable({
  providedIn: "root",
})
export class CustomerEnquiriesService {
  private http = inject(HttpClient);

  getEnquiriesList() {
    return this.http.get<CustomerenquiryResponse>(`${environment.apiURL}/enquiries-list`, {
      withCredentials: true,
    }).pipe(
      map(response => response.items || [])
    );
  }
}
