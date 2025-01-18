// 필요한 모듈 import
const register = require("react-server-dom-webpack/node-register");
register();
const babelRegister = require("@babel/register");
const express = require("express");
const path = require("path");
const { readFileSync, readdirSync } = require("fs");
const {
  renderToPipeableStream,
} = require("react-server-dom-webpack/server.node");
const React = require("react");

const PORT = process.env.PORT || 4000;
const ROOT_PATH = process.env.ROOT_PATH;
const CLIENT_DIST_PATH = path.resolve(ROOT_PATH, "./dist/client");
const APP_PATH = path.resolve(ROOT_PATH, "packages/client/app");

configureBabel();

const app = express();
app.use(express.json());
app.use(express.text());
app.use(express.static(CLIENT_DIST_PATH));

const routes = new Map();

async function startServer() {
  await buildRoutes(APP_PATH);
  setupRoutes(app);
  logRegisteredRoutes();

  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
}

function configureBabel() {
  babelRegister({
    ignore: [/[\\\/](node_modules)[\\\/]/],
    presets: [
      ["@babel/preset-react", { runtime: "automatic" }],
      "@babel/preset-typescript",
    ],
    plugins: [
      "@babel/transform-modules-commonjs",
      "@babel/plugin-transform-runtime",
    ],
    extensions: [".ts", ".tsx", ".js", ".jsx"],
    only: [APP_PATH],
  });
}

function getClientManifest() {
  return readFileSync(
    path.resolve(CLIENT_DIST_PATH, `./react-client-manifest.json`),
    "utf8"
  );
}

function sendHtmlResponse(res) {
  const html = readFileSync(
    path.resolve(CLIENT_DIST_PATH, `./index.html`),
    "utf8"
  ).replace('src="main.js"', 'src="/main.js"');
  res.send(html);
}

function matchRoute(pathname) {
  if (pathname === "/") {
    return routes.has("") ? { handler: routes.get(""), params: {} } : null;
  }

  for (const [route, handler] of routes) {
    const routeParts = route.split("/").filter(Boolean);
    const pathParts = pathname.split("/").filter(Boolean);

    if (routeParts.length !== pathParts.length) continue;

    const params = {};
    const match = routeParts.every((part, index) => {
      if (part.startsWith("[") && part.endsWith("]")) {
        params[part.slice(1, -1)] = pathParts[index];
        return true;
      }
      return part === pathParts[index];
    });

    if (match) return { handler, params };
  }
  return null;
}

async function buildRoutes(dir, baseRoute = "") {
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const route = path.join(baseRoute, entry.name.replace(/\.js?$/, ""));

    if (entry.isDirectory()) {
      await buildRoutes(fullPath, route);
    } else if (entry.name.endsWith("page.tsx")) {
      const routePath = route.replace(/\/?page\.tsx$/, "");
      routes.set(routePath, require(fullPath).default);
    }
  }
}

async function handleRSC(req, res) {
  const moduleMap = JSON.parse(getClientManifest());
  const pathname = req.query.pathname || "/";
  const route = matchRoute(pathname);

  if (!route) {
    res.status(404).end("Not Found");
    return;
  }

  const { handler, params } = route;
  const component = React.createElement(handler, { params });
  const stream = renderToPipeableStream(component, moduleMap);

  res.setHeader("Content-Type", "text/plain");
  res.setHeader("Cache-Control", "no-cache");

  stream.pipe(res).on("error", (err) => {
    console.error("Stream error:", err);
    res.status(500).end("Internal Server Error");
  });
}

function setupRoutes(app) {
  app.get("/rsc", handleRSC);

  app.get("*", (_req, res) => sendHtmlResponse(res));
}

function logRegisteredRoutes() {
  for (const [route] of routes) {
    console.log(`Registered route: ${route}`);
  }
}

startServer();
