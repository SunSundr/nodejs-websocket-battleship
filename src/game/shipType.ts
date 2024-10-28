import { ShipType } from './types';

export function getShipType(length: number): ShipType {
  switch (length) {
    case 1:
      return ShipType.small;
    case 2:
      return ShipType.medium;
    case 3:
      return ShipType.large;
    case 4:
      return ShipType.huge;
    default:
      return ShipType.unknown;
  }
}
