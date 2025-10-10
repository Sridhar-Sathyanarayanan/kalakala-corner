// src/app/services/product.service.ts
import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../environments/environment";
interface JWT {
  message: string;
  token: string;
}

@Injectable({
  providedIn: "root",
})
export class AppService {
  private http = inject(HttpClient);

  login(username: string, password: string): Observable<JWT> {
    return this.http.post<JWT>(`${environment.apiURL}/login`, {
      username,
      password,
    });
  }
}
