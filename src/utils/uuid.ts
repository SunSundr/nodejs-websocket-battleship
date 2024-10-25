export function uuid4(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);

  array[6] = (array[6] & 0x0f) | 0x40;
  array[8] = (array[8] & 0x3f) | 0x80;

  const hexArray = Array.from(array, (byte) => byte.toString(16).padStart(2, '0'));
  const hexPart = (start: number, end: number) => hexArray.slice(start, end).join('');

  return `${hexPart(0, 4)}-${hexPart(4, 6)}-${hexPart(6, 8)}-${hexPart(8, 10)}-${hexPart(10, 16)}`;
}
