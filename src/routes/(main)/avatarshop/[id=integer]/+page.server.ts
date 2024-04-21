import { squery, surql } from "$lib/server/surreal"
import { error, redirect } from "@sveltejs/kit"

export async function load({ params }) {
	const asset = await squery<{
		id: number
		name: string
	}>(surql`SELECT name, meta::id(id) AS id FROM $asset`, {
		asset: `asset:${params.id}`,
	})

	if (!asset) error(404, "Not found")

	redirect(302, `/avatarshop/${params.id}/${asset.name}`)
}