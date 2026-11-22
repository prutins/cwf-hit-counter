# cwf-hit-counter
super-basic hit counter using Cloudflare Workers


## Setup

```sh
npm install
npm run dev      # local dev (Durable Object storage is simulated locally)
npm run deploy
```

No resource IDs to create: the Durable Object is declared in `wrangler.toml`
and created on first deploy.

## Usage

- `GET /` increments and returns `{"page":"default","hits":N}`
- `GET /?page=home` uses a separate counter per page name
- `GET /?page=home&peek=1` reads the count without incrementing

Each page name is its own SQLite-backed Durable Object, which processes requests
one at a time, so counts stay exact under concurrent traffic. SQLite-backed
objects are available on the Workers free plan (daily limits apply, roughly
100,000 hits per day).
