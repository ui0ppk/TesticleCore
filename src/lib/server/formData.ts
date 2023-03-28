// Handle form data

/**
 * Handles form data in a simpler way.
 * @param request A request object.
 * @returns An object containing the form data.
 * @example
 * const data = await formData(request)
 * const text = data.text
 */
export default async function (request: Request) {
	const entries = Object.fromEntries((await request.formData()).entries())
	const data: { [k: string]: string } = {}
	for (let entry in entries) data[entry] = (entries[entry] as string).trim()

	return data
}