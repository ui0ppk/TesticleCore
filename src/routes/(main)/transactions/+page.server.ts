import { authorise } from "$lib/server/lucia"
import { RecordId, equery } from "$lib/server/surreal"
import transactionsQuery from "./transactions.surql"

type Transaction = {
	amountSent: number
	id: string
	in: string
	link: string
	note: string
	out: string
	receiver: BasicUser
	sender: BasicUser
	taxRate: number
	time: string
}

export async function load({ locals }) {
	const [transactions] = await equery<Transaction[][]>(transactionsQuery, {
		user: new RecordId("user", (await authorise(locals)).user.id),
	})

	return { transactions }
}
