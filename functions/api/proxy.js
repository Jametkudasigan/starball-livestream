// Cloudflare Pages Function — Stream Proxy
export async function onRequest(context) {
    const url = new URL(context.request.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
        return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const proxyRes = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
        });

        // Handle redirects
        if (proxyRes.status >= 300 && proxyRes.status < 400) {
            const redirectUrl = proxyRes.headers.get('Location');
            return new Response(null, {
                status: 302,
                headers: { 'Location': `/api/proxy?url=${encodeURIComponent(redirectUrl)}` }
            });
        }

        // Copy response with CORS headers
        const headers = new Headers(proxyRes.headers);
        headers.set('Access-Control-Allow-Origin', '*');
        headers.set('Cache-Control', 'no-cache');

        return new Response(proxyRes.body, {
            status: proxyRes.status,
            headers,
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: 'Proxy error', message: err.message }), {
            status: 502,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
