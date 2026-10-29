import { OBJECTS } from '../data/objects';
import { WreckObject } from './DeformationSystem';

export const ObjectFactory = {
  create(id: string, hpMult = 1, detail = 46): WreckObject {
    const def = OBJECTS[id] ?? OBJECTS.cap;
    return new WreckObject(def, hpMult, detail);
  },
};
