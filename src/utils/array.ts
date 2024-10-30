export function removeFromArray(array: unknown[], item: unknown): void {
  const index = array.indexOf(item);
  if (index > -1) array.splice(index, 1);
}

export function getRandomElement<T>(array: unknown[]): T {
  return array[Math.floor(Math.random() * array.length)] as T;
}
