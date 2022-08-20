import { createProxyMiddleware } from "http-proxy-middleware";
import { NextApiRequest, NextApiResponse } from "next";
import nc, { Middleware } from "next-connect";
import bodyParser from "body-parser";

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

const forward: Middleware<NextApiRequest, NextApiResponse> = (req, res, next) =>
  next();

function base() {
  const proxy = createProxyMiddleware({
    target: "http://localhost:8128",
    pathRewrite(path, req) {
      return path.replace(/^(\/api)/, "");
    },
    onProxyReq(proxyReq, req, res) {
      if (req.body && ["POST", "PUT", "PATCH"].includes(req.method)) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader("Content-Type", "application/json");
        proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));

        proxyReq.write(bodyData);
      }
    },
    changeOrigin: true,
  });

  return nc<NextApiRequest, NextApiResponse>({
    onError: (err, req, res, next) => {
      console.error(err.stack);
      res.status(500).end("Something broke!");
    },

    onNoMatch: (req, res) => {
      res.status(404).end("Page is not found");
    },

    attachParams: true,
  })
    .use(bodyParser.json())
    .all(forward)
    .use(proxy);
}

export default base();
