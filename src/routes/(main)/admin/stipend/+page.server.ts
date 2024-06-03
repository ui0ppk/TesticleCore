import formError from "$lib/server/formError"
import { authorise } from "$lib/server/lucia"
import ratelimit from "$lib/server/ratelimit"
import { Action, auditLog, equery, surrealql } from "$lib/server/surreal"
import { zod } from "sveltekit-superforms/adapters"
import { message, superValidate } from "sveltekit-superforms/server"
import { z } from "zod"

const schema = z.object({
	dailyStipend: z.number().int().positive().max(100),
	stipendTime: z.number().min(1),
})

async function getEconomy() {
	const [[economy]] = await equery<
		{
			dailyStipend?: number
			stipendTime?: number
		}[][]
	>(surrealql`SELECT * FROM stuff:economy`)

	return {
		dailyStipend: economy?.dailyStipend || 10,
		stipendTime: economy?.stipendTime || 12,
	}
}

export async function load({ locals }) {
	await authorise(locals, 5)

	return {
		form: await superValidate(zod(schema)),
		...(await getEconomy()),
	}
}

export const actions: import("./$types").Actions = {}
actions.updateStipend = async ({ request, locals, getClientAddress }) => {
	const { user } = await authorise(locals, 5)
	const form = await superValidate(request, zod(schema))
	if (!form.valid) return formError(form)

	const limit = ratelimit(form, "economy", getClientAddress, 30)
	if (limit) return limit

	const current = await getEconomy()
	const { dailyStipend, stipendTime } = form.data

	if (
		current.dailyStipend === dailyStipend &&
		current.stipendTime === stipendTime
	)
		return message(form, "No changes were made")

	await equery(
		surrealql`UPDATE stuff:economy MERGE ${{ dailyStipend, stipendTime }}`
	)

	let auditText = ""

	if (current.dailyStipend !== dailyStipend)
		auditText += `Change daily stipend from ${current.dailyStipend} to ${dailyStipend}`

	if (current.stipendTime !== stipendTime) {
		if (auditText) auditText += ", "
		auditText += `Change stipend time from ${current.stipendTime} to ${stipendTime}`
	}

	await auditLog(Action.Economy, auditText, user.id)

	return message(form, "Economy updated successfully!")
}
