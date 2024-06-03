import formError from "$lib/server/formError"
import { authorise } from "$lib/server/lucia"
import { RecordId, equery, surrealql } from "$lib/server/surreal"
import { Scrypt } from "oslo/password"
import { zod } from "sveltekit-superforms/adapters"
import { message, superValidate } from "sveltekit-superforms/server"
import { z } from "zod"
import updateProfileQuery from "./updateProfile.surql"

const profileSchema = z.object({
	// theme: z.enum(["standard", "darken", "storm", "solar"]),
	bio: z.string().max(1000).optional(),
})
const passwordSchema = z.object({
	cpassword: z.string().min(1),
	npassword: z.string().min(1),
	cnpassword: z.string().min(1),
})
const stylingSchema = z.object({
	css: z.string().max(10000).optional(),
})

export const load = async () => ({
	profileForm: await superValidate(zod(profileSchema)),
	passwordForm: await superValidate(zod(passwordSchema)),
	stylingForm: await superValidate(zod(stylingSchema)),
})

export const actions: import("./$types").Actions = {}
actions.profile = async ({ request, locals }) => {
	const { user } = await authorise(locals)

	const form = await superValidate(request, zod(profileSchema))
	if (!form.valid) return formError(form)

	const { bio } = form.data

	await equery(updateProfileQuery, {
		user: new RecordId("user", user.id),
		bio,
		// theme,
	})

	return message(form, "Profile updated successfully!")
}
actions.password = async ({ request, locals }) => {
	const { user } = await authorise(locals)

	const form = await superValidate(request, zod(passwordSchema))
	if (!form.valid) return formError(form)

	const { cpassword, npassword, cnpassword } = form.data

	if (npassword !== cnpassword)
		return formError(form, ["cnpassword"], ["Passwords do not match"])

	if (npassword === cpassword)
		return formError(
			form,
			["npassword", "cnpassword"],
			["New password cannot be the same as the current password", ""]
		)

	if (user.hashedPassword.startsWith("s2:"))
		user.hashedPassword = user.hashedPassword.slice(3)

	if (!(await new Scrypt().verify(user.hashedPassword, cpassword)))
		return formError(form, ["cpassword"], ["Incorrect password"])

	await equery(
		surrealql`UPDATE ${new RecordId(
			"user",
			user.id
		)} SET hashedPassword = ${await new Scrypt().hash(npassword)}`
	)

	// Don't send the password back to the client
	form.data.cpassword = ""
	form.data.npassword = ""
	form.data.cnpassword = ""

	return message(form, "Password updated successfully!")
}
actions.styling = async ({ request, locals }) => {
	const { user } = await authorise(locals)

	const form = await superValidate(request, zod(stylingSchema))
	if (!form.valid) return formError(form)

	const { css } = form.data
	if (css === "undefined") return message(form, "Styling already saved!")

	await equery(
		surrealql`UPDATE ${new RecordId("user", user.id)} SET css = ${css}`
	)

	return message(form, "Styling updated successfully!")
}
