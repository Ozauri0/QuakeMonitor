import { EventEmitter } from "events";
import { QuakeEvent } from "@/app/types/quake";
import { Station } from "@/app/types/station";

class QuakeEventEmitter extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(200);
  }
}

export const quakeEmitter = new QuakeEventEmitter();

export function broadcastQuake(quake: QuakeEvent) {
  quakeEmitter.emit("quake", quake);
}

class StationEventEmitter extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(200);
  }
}

export const stationEmitter = new StationEventEmitter();

export function broadcastStations(stations: Station[]) {
  stationEmitter.emit("stations", stations);
}
