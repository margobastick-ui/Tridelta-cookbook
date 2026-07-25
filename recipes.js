// Cloudflare Pages Function — handles GET (list) and POST (add) for /api/recipes
// Requires a KV namespace bound as RECIPES_KV (Pages project settings > Functions > KV bindings)

const STORAGE_KEY = "recipes";

export async function onRequestGet(context) {
  const { env } = context;
  try {
    const raw = await env.RECIPES_KV.get(STORAGE_KEY);
    const recipes = raw ? JSON.parse(raw) : [];
    return Response.json(recipes);
  } catch (err) {
    return new Response(JSON.stringify({ error: "Failed to load recipes" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function onRequestPost(context) {
  const { env, request } = context;
  try {
    const recipe = await request.json();

    if (!recipe || !recipe.recipeName || !recipe.submitterName) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const raw = await env.RECIPES_KV.get(STORAGE_KEY);
    const recipes = raw ? JSON.parse(raw) : [];
    recipes.push(recipe);
    await env.RECIPES_KV.put(STORAGE_KEY, JSON.stringify(recipes));

    return Response.json({ ok: true, recipe });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Failed to save recipe" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
