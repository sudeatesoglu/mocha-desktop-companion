/** Loads and decodes an image so it can be drawn immediately. */
export async function loadImage(url: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.src = url;
  await image.decode(); // rejects if the file is missing or not an image
  return image;
}
