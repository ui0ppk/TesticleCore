import type { PageServerLoad } from "./$types"
import { findGroups } from "$lib/server/prisma"

export const load: PageServerLoad = async () => ({
	groups: findGroups({
		select: {
			name: true,
		},
	}),
})