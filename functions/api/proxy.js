<<<<<<< HEAD
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
=======
// Cloudflare Pages Function: /api/proxy?url=...
// Proxies m3u8/DASH streams with CORS headers and URL rewriting

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get('url');

  if (!targetUrl) {
    return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Validate URL
    const target = new URL(targetUrl);
    if (!['http:', 'https:'].includes(target.protocol)) {
      return new Response('Invalid protocol', { status: 400 });
    }

    // Fetch the target
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
        'Origin': target.origin,
        'Referer': target.origin + '/'
      },
      redirect: 'follow'
    });

    if (!response.ok) {
      return new Response(`Upstream error: ${response.status}`, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || '';
    const body = await response.text();

    // For m3u8 files, rewrite relative URLs to absolute
    if (targetUrl.includes('.m3u8') || contentType.includes('mpegurl') || contentType.includes('m3u8')) {
      const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);
      const rewritten = rewriteM3u8(body, baseUrl, url.origin);
      
      return new Response(rewritten, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Access-Control-Allow-Headers': '*',
          'Cache-Control': 'no-cache'
        }
      });
    }

    // For other content (segments, etc), pass through
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': contentType || 'application/octet-stream',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Cache-Control': 'public, max-age=300'
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

function rewriteM3u8(content, baseUrl, proxyOrigin) {
  const lines = content.split('\n');
  return lines.map(line => {
    const trimmed = line.trim();
    
    // Skip empty lines and tags
    if (!trimmed || trimmed.startsWith('#')) return line;
    
    // Already absolute URL
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return `${proxyOrigin}/api/proxy?url=${encodeURIComponent(trimmed)}`;
    }
    
    // Relative URL - resolve to absolute first
    try {
      const absoluteUrl = new URL(trimmed, baseUrl).href;
      return `${proxyOrigin}/api/proxy?url=${encodeURIComponent(absoluteUrl)}`;
    } catch {
      return line;
    }
  }).join('\n');
>>>>>>> 6430c66 (Self-contained streaming: hls.js player + m3u8 proxy)
}
