import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

type HomepagePreviewEventPayload = {
  type: 'homepage-sections-updated';
  ts: number;
};

@Injectable()
export class HomepagePreviewEventsService {
  private readonly subject = new Subject<HomepagePreviewEventPayload>();

  stream(): Observable<HomepagePreviewEventPayload> {
    return this.subject.asObservable();
  }

  notifyHomepageSectionsUpdated() {
    this.subject.next({
      type: 'homepage-sections-updated',
      ts: Date.now(),
    });
  }
}
