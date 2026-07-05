// provisioning/worker.js
// Provisioning API Secretar (ТЗ §6) — единственный облачный компонент.
// Stateless Cloudflare Worker: выдаёт пользователю поддомен и Cloudflare-туннель.
// Хранит ТОЛЬКО {поддомен -> id туннеля} в KV (NAMES). Никаких данных пользователя.
//
// POST /provision  {"name": "ivan"}  ->
//   {"subdomain":"ivan","app_url":"https://ivan.secretarchik.online",
//    "n8n_url":"https://ivan-n8n.secretarchik.online","tunnel_token":"...","tunnel_id":"..."}
//
// Secrets (wrangler secret / dashboard):
//   CF_API_TOKEN — токен с правами Account:Cloudflare Tunnel:Edit + Zone:DNS:Edit
// Vars: ACCOUNT_ID, ZONE_ID, BASE_DOMAIN (secretarchik.online)
// KV binding: NAMES

const NAME_RE = /^[a-z][a-z0-9-]{1,28}[a-z0-9]$/;
const RESERVED = new Set([
  "app", "n8n", "www", "api", "mail", "admin", "provision", "secretar",
  "test", "demo", "status", "docs", "blog",
]);

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

async function cf(env, method, path, body) {
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    method,
    headers: {
      authorization: `Bearer ${env.CF_API_TOKEN}`,
      "content-type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({ success: false, errors: [{ message: "bad json" }] }));
  if (!data.success) {
    throw new Error(`CF API ${method} ${path}: ${JSON.stringify(data.errors).slice(0, 300)}`);
  }
  return data.result;
}

async function provision(env, name) {
  // 1. Туннель (конфигурация управляется из Cloudflare — ingress задаём тут же)
  const tunnelSecret = crypto.getRandomValues(new Uint8Array(32));
  const tunnel = await cf(env, "POST", `/accounts/${env.ACCOUNT_ID}/cfd_tunnel`, {
    name: `secretar-${name}`,
    config_src: "cloudflare",
    tunnel_secret: btoa(String.fromCharCode(...tunnelSecret)),
  });

  const appHost = `${name}.${env.BASE_DOMAIN}`;
  const n8nHost = `${name}-n8n.${env.BASE_DOMAIN}`;

  // 2. Ingress: app -> frontend, n8n -> n8n
  await cf(env, "PUT", `/accounts/${env.ACCOUNT_ID}/cfd_tunnel/${tunnel.id}/configurations`, {
    config: {
      ingress: [
        { hostname: appHost, service: "http://frontend:3000" },
        { hostname: n8nHost, service: "http://n8n:5678" },
        { service: "http_status:404" },
      ],
    },
  });

  // 3. DNS: проксируемые CNAME на туннель
  const target = `${tunnel.id}.cfargotunnel.com`;
  for (const host of [appHost, n8nHost]) {
    await cf(env, "POST", `/zones/${env.ZONE_ID}/dns_records`, {
      type: "CNAME",
      name: host,
      content: target,
      proxied: true,
      ttl: 1,
      comment: "secretar provisioning",
    });
  }

  // 4. Токен коннектора
  const token = await cf(env, "GET", `/accounts/${env.ACCOUNT_ID}/cfd_tunnel/${tunnel.id}/token`);

  return {
    subdomain: name,
    app_url: `https://${appHost}`,
    n8n_url: `https://${n8nHost}`,
    tunnel_id: tunnel.id,
    tunnel_token: token,
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/") {
      return json({ service: "secretar-provisioning", ok: true });
    }

    if (request.method === "POST" && url.pathname === "/provision") {
      // Простейшая защита от абьюза: 5 установок в час с одного IP
      const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
      const rlKey = `rl:${ip}:${Math.floor(Date.now() / 3600_000)}`;
      const used = Number((await env.NAMES.get(rlKey)) ?? 0);
      if (used >= 5) return json({ error: "Слишком много запросов, попробуйте позже" }, 429);
      await env.NAMES.put(rlKey, String(used + 1), { expirationTtl: 3700 });

      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: "Ожидается JSON {name}" }, 400);
      }
      const name = String(body?.name ?? "").toLowerCase().trim();
      if (!NAME_RE.test(name) || RESERVED.has(name)) {
        return json(
          { error: "Имя: 3–30 символов, латиница/цифры/дефис, не зарезервировано" },
          400
        );
      }

      // Занятость
      if (await env.NAMES.get(`name:${name}`)) {
        return json({ error: "Имя занято, выберите другое" }, 409);
      }

      try {
        const result = await provision(env, name);
        await env.NAMES.put(`name:${name}`, result.tunnel_id);
        return json(result);
      } catch (e) {
        return json({ error: `Provisioning не удался: ${String(e).slice(0, 300)}` }, 502);
      }
    }

    return json({ error: "not found" }, 404);
  },
};
