// Chronicle of beats (narrative events)
import { Beat } from '../sim/reconfig/operators';

export interface Chronicle {
  beats: Beat[];
  maxBeats: number;
}

export const createChronicle = (): Chronicle => ({
  beats: [],
  maxBeats: 50,
});

export const addBeat = (chronicle: Chronicle, beat: Beat): void => {
  chronicle.beats.unshift(beat);
  if (chronicle.beats.length > chronicle.maxBeats) {
    chronicle.beats.pop();
  }
};
