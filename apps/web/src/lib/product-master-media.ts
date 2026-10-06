/** Product Master requirements are independent of marketplace media policies. */
export const MIN_MASTER_IMAGES = 1;

export function getMasterMediaReadiness(images: readonly string[]) {
  // Count populated gallery slots, as shown in Media. Duplicate URLs do not
  // invalidate the single-image minimum; empty placeholders never satisfy it.
  const count = images.filter(image => image.trim()).length;
  return { count, ready: count >= MIN_MASTER_IMAGES };
}
