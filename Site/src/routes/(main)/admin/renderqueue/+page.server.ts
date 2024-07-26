import { authorise } from "$lib/server/lucia"
import type { RenderType, Status } from "$lib/server/requestRender"
import { equery, surql } from "$lib/server/surreal"
import renderQueueQuery from "./renderqueue.surql"

type Render = {
	id: number
	type: RenderType
	status: Status
	created: string
	completed: string | null
	relativeId: number
	user?: BasicUser
	asset?: {
		id: number
		name: string
	}
}

export async function load({ locals }) {
	await authorise(locals, 3)

	const [[status], [queue]] = await Promise.all([
		equery<string[]>(surql`stuff:ping.render`),
		equery<Render[][]>(renderQueueQuery),
	])

	return { status, queue }
}