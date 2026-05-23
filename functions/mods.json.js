export async function onRequest(context) {
    const { request, env } = context;
    
    // Fetch the actual mods.json file
    const url = new URL(request.url);
    const response = await fetch(`https://raw.githubusercontent.com/fzrholdings/ets2-lk-mods-hub/main/mods.json`);
    
    // Create new response with cache-control headers
    const newResponse = new Response(response.body, response);
    newResponse.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    newResponse.headers.set('Pragma', 'no-cache');
    newResponse.headers.set('Expires', '0');
    
    return newResponse;
}
