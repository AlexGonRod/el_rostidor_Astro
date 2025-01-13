import type { APIRoute } from "astro";
export const prerender = false;

const token = import.meta.env.IG_TOKEN ?? ""
const url = import.meta.env.IG_URL ?? "";

export const GET: APIRoute = async () => {
	if (!token) return new Response(JSON.stringify({ message: "IG token not found" }), { status: 400 })


	const response = await fetch(url + token)
	const { data } = await response.json()

	return new Response(JSON.stringify({
		images: data,
		message: "IG images OK"
	}))
}
