import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from "src/environments/environment";

@Injectable({
  providedIn: "root",
})
export class HomeService {
  constructor(private readonly http: HttpClient) {}

  submitComplaint(originalText: string, serviceType: string): Observable<any> {
    return this.http.post<any>(`${environment.generateComplaintURL}`, {
      originalText,
      serviceType,
    });
  }

  generateParaphraseWithComplaintId(complaintId: string): Observable<any> {
    return this.http.post<any>(
      `${environment.generateParaphraseWithComplaintId}`,
      {complaintId}
    );
  }

  editComplaint(originalText: string, complaintId: string): Observable<any> {
    return this.http.put<any>(
      `${environment.editComplaintURL}/${complaintId}/text`,
      { originalText }
    );
  }

  acceptRejectComplaint(
    complaintId: string,
    paraphraseId: string,
    action: string,
    feedback?: string
  ): Observable<any> {
    return this.http.post<any>(`${environment.acceptRejectUrl}`, {
      complaintId,
      paraphraseId,
      action,
      feedback,
    });
  }
}
