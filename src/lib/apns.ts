// Sends native iOS push notifications straight to Apple (APNs), for the
// App Store app. Web push (VAPID, see check-goals) only works in
// browsers - the iPhone app shows the site inside a native container
// that can't receive browser-style push, so it registers with Apple
// directly instead (see pushClient.ts) and its device token is sent
// through here.
//
// Server-only (Node's http2 + crypto) - never import this from client
// code or an edge-runtime route.
//
// Needs three environment variables in Vercel, all from the Apple
// Developer account (Certificates, IDs & Profiles -> Keys):
//   APNS_KEY_ID       the key's 10-character Key ID
//   APNS_TEAM_ID      the account's Team ID
//   APNS_PRIVATE_KEY  the full contents of the downloaded .p8 file,
//                     including the BEGIN/END lines
// Without them this quietly reports "not configured" and sends nothing,
// so browser notifications keep working either way.

import http2 from "node:http2";
import crypto from "node:crypto";

const BUNDLE_ID = process.env.APNS_BUNDLE_ID || "com.ilai.clubside";
const PRODUCTION_HOST = "api.push.apple.com";
// Builds run straight from Xcode on a phone get "sandbox" tokens, which
// only Apple's sandbox server accepts. App Store and TestFlight builds
// get production tokens. Rather than tracking which is which, a token
// production rejects as BadDeviceToken is simply retried on sandbox.
const SANDBOX_HOST = "api.sandbox.push.apple.com";

export type ApnsResult = "sent" | "gone" | "error";

export function isApnsConfigured(): boolean {
  return Boolean(
    process.env.APNS_KEY_ID && process.env.APNS_TEAM_ID && process.env.APNS_PRIVATE_KEY
  );
}

// Apple wants a fresh signed token at most once every 20 minutes and
// rejects ones older than an hour, so one is reused for ~50 minutes.
let cachedJwt: { token: string; issuedAt: number } | null = null;

function getJwt(): string {
  const now = Math.floor(Date.now() / 1000);
  if (cachedJwt && now - cachedJwt.issuedAt < 50 * 60) return cachedJwt.token;

  const keyId = process.env.APNS_KEY_ID as string;
  const teamId = process.env.APNS_TEAM_ID as string;
  const privateKey = normalizePem(process.env.APNS_PRIVATE_KEY as string);

  const header = Buffer.from(JSON.stringify({ alg: "ES256", kid: keyId })).toString("base64url");
  const claims = Buffer.from(JSON.stringify({ iss: teamId, iat: now })).toString("base64url");
  const signingInput = `${header}.${claims}`;
  const signature = crypto
    .sign("sha256", Buffer.from(signingInput), { key: privateKey, dsaEncoding: "ieee-p1363" })
    .toString("base64url");

  const token = `${signingInput}.${signature}`;
  cachedJwt = { token, issuedAt: now };
  return token;
}

// The .p8 key can end up in the environment variable in different
// shapes depending on how it was pasted: with real line breaks, with
// literal "\n" sequences, or with the line breaks stripped out entirely
// (some single-line input boxes do that). Node only accepts a properly
// formatted PEM, so this rebuilds one from whatever arrived.
function normalizePem(raw: string): string {
  const body = raw
    .replace(/\\n/g, "\n")
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const lines = body.match(/.{1,64}/g) ?? [];
  return `-----BEGIN PRIVATE KEY-----\n${lines.join("\n")}\n-----END PRIVATE KEY-----\n`;
}

function sendOnce(
  host: string,
  deviceToken: string,
  jwt: string,
  body: string
): Promise<{ status: number; reason?: string }> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: { status: number; reason?: string }) => {
      if (settled) return;
      settled = true;
      try {
        client.close();
      } catch {
        // already closed
      }
      resolve(result);
    };

    const client = http2.connect(`https://${host}`);
    client.on("error", (error) => finish({ status: 0, reason: String(error) }));

    const request = client.request({
      ":method": "POST",
      ":path": `/3/device/${deviceToken}`,
      authorization: `bearer ${jwt}`,
      "apns-topic": BUNDLE_ID,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "content-type": "application/json",
    });

    let status = 0;
    let responseBody = "";
    request.setEncoding("utf8");
    request.on("response", (headers) => {
      status = Number(headers[":status"]);
    });
    request.on("data", (chunk: string) => {
      responseBody += chunk;
    });
    request.on("end", () => {
      let reason: string | undefined;
      try {
        reason = responseBody ? JSON.parse(responseBody).reason : undefined;
      } catch {
        reason = responseBody || undefined;
      }
      finish({ status, reason });
    });
    request.on("error", (error) => finish({ status: 0, reason: String(error) }));
    request.setTimeout(10_000, () => {
      request.close();
      finish({ status: 0, reason: "timeout" });
    });

    request.end(body);
  });
}

/** Sends one notification to one iOS device. "gone" means the token is no longer valid (app deleted, notifications turned off) and should be forgotten. */
export async function sendApnsNotification(
  deviceToken: string,
  message: { title: string; body: string; url: string }
): Promise<ApnsResult> {
  if (!isApnsConfigured()) return "error";

  let jwt: string;
  try {
    jwt = getJwt();
  } catch (error) {
    console.error("apns: couldn't sign the auth token - check APNS_PRIVATE_KEY/APNS_KEY_ID/APNS_TEAM_ID", error);
    return "error";
  }

  const body = JSON.stringify({
    aps: { alert: { title: message.title, body: message.body }, sound: "default" },
    url: message.url,
  });

  let result = await sendOnce(PRODUCTION_HOST, deviceToken, jwt, body);
  if (result.status === 400 && result.reason === "BadDeviceToken") {
    result = await sendOnce(SANDBOX_HOST, deviceToken, jwt, body);
  }

  if (result.status === 200) return "sent";
  if (result.status === 410 || (result.status === 400 && result.reason === "BadDeviceToken")) {
    return "gone";
  }
  console.error(`apns: send failed (${result.status} ${result.reason ?? ""})`);
  return "error";
}
