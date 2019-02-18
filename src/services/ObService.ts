import { EventEmitter } from 'events';
import { Observable } from 'rxjs';
import { EntityModel } from 'serendip-business-model';

export class ObService {
  private eventEmitter: EventEmitter = new EventEmitter();
  public listen(
    channel: string
  ): Observable<{
    eventType: "insert" | "delete" | "update";
    model: EntityModel;
  }> {
    return new Observable(obServer => {
      this.eventEmitter.on(channel, (eventType, model: EntityModel) => {
        obServer.next({ eventType, model });
      });
    });
  }
  public publish(
    channel: string,
    eventType: "insert" | "delete" | "update",
    model: EntityModel
  ) {
    this.eventEmitter.emit(channel, eventType, model);
  }
}
