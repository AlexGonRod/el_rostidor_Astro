import type { APIRoute } from "astro";
export const prerender = false;
const _url = "https://graph.instagram.com/v21.0/"

const token = import.meta.env.IG_TOKEN ?? "";
const url = import.meta.env.IG_URL ?? "";

export const GET: APIRoute = async () => {
    const response = await fetch(url + token)
    const {data} = await response.json()

    return new Response(JSON.stringify({
        images: data,
        message: "IG images OK"
    }))
}
