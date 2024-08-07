import sharp, { type ResizeOptions } from "sharp"

/**
 * Creates an image asset based off a file object
 * @param file A File object for the image to save
 * @param sharpOptions Extra options to pass to sharp
 * @returns A function that saves the image to ../data/assets
 * @example
 * const save = await imageAsset(image)
 * const id = // Load from database
 * save(id)
 */
export async function imageAsset(file: File, sharpOptions?: ResizeOptions) {
	const fileBuffer = await sharp(await file.arrayBuffer())
		.resize(256, 256, {
			fit: "contain",
			...sharpOptions,
		})
		.png()
		.toBuffer()
		.catch(() => {
			throw new Error("Image asset failed to upload")
		})

	return (id: number) =>
		Bun.write(`../data/assets/${id}`, fileBuffer.toString())
}

/**
 * Creates a clothing asset based off a file object
 * @param file A File object for the image to save
 * @param sharpOptions Extra options to pass to sharp
 * @returns A function that saves the image to ../data/assets
 * @example
 * const save = await clothingAsset(image)
 * const id = // Load from database
 * save(id)
 */
export async function clothingAsset(file: File, sharpOptions?: ResizeOptions) {
	const fileBuffer = await sharp(await file.arrayBuffer())
		.resize(585, 559, {
			fit: "fill",
			...sharpOptions,
		})
		.png()
		.toBuffer()
		.catch(() => {
			throw new Error("Image asset failed to upload")
		})

	return (id: number) =>
		Bun.write(`../data/assets/${id}`, fileBuffer.toString())
}

/**
 * Creates an image thumbnail based off a file object
 * @param file A File object for the image to save
 * @param sharpOptions Extra options to pass to sharp
 * @returns A function that saves the image to data/assets
 * @example
 * const save = await thumbnail(image)
 * const id = // Load from database
 * save(id)
 */
export async function thumbnail(file: File, sharpOptions?: ResizeOptions) {
	const fileBuffer = await sharp(await file.arrayBuffer())
		.resize(420, 420, {
			fit: "fill",
			...sharpOptions,
		})
		.webp() // sorry avif, but webp is just magic
		.toBuffer()
		.catch(() => {
			throw new Error("Thumbnail failed to upload")
		})

	return (id: number) =>
		Bun.write(`../data/thumbnails/${id}`, fileBuffer.toString())
}

const tShirtOpts = Object.freeze({
	fit: "contain",
	position: "top",
	background: { r: 0, g: 0, b: 0, alpha: 0 },
})

/**
 * Creates an T-Shirt image asset based off a file object
 * @param file A File object for the image to save
 * @returns A function that saves the image to ../data/assets
 * @example
 * const save = await tShirt(image)
 * const id = // Load from database
 * save(id)
 */
export async function tShirt(file: File) {
	const fileBuffer = await sharp(await file.arrayBuffer())
		.resize(420, 420, tShirtOpts)
		.png()
		.toBuffer()
		.catch(() => {
			throw new Error("Image asset failed to upload")
		})

	return (id: number) =>
		Bun.write(`../data/assets/${id}`, fileBuffer.toString())
}

/**
 * Creates a T-Shirt thumbnail based off a file object
 * @param file A File object for the image to save
 * @returns A function that saves the image to data/assets
 * @example
 * const save = await tShirtThumbnail(image)
 * const id = // Load from database
 * save(id)
 */
export async function tShirtThumbnail(file: File) {
	const input = await sharp(await file.arrayBuffer())
		.resize(250, 250, tShirtOpts)
		.toBuffer()

	const fileBuffer = await sharp("static/tShirtTemplate.webp")
		.composite([{ input }])
		.webp()
		.toBuffer()
		.catch(() => {
			throw new Error("Thumbnail failed to upload")
		})

	return (id: number) =>
		Bun.write(`../data/thumbnails/${id}`, fileBuffer.toString())
}
