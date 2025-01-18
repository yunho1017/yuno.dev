import React from "react";
import { createRoot } from "react-dom/client";
const {
  createFromReadableStream,
  encodeReply,
  createFromFetch,
} = require("react-server-dom-webpack/client");

const Layout = ({ children }: { children: React.ReactNode }) => {
  return <div>{children}</div>;
};

export const callServer = async (id: string, args: unknown) => {
  const fetchPromise = fetch(`/action`, {
    method: "POST",
    headers: { "rsc-action": id },
    body: await encodeReply(args),
  });

  return createFromFetch(fetchPromise);
};

async function hydrate() {
  const pathname = window.location.pathname;
  const response = await fetch(`/rsc?pathname=${pathname}`);
  const rscTree = createFromReadableStream(response.body, { callServer });

  const container = document.getElementById("root");

  const root = createRoot(container!);
  root.render(<Layout>{rscTree}</Layout>);
}

hydrate();
