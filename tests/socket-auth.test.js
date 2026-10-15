
const test = require("node:test");
const assert = require("node:assert/strict");

const { io } = require("../client/node_modules/socket.io-client");

const BASE_URL =
  process.env.TEST_BASE_URL || "http://127.0.0.1:3000";

function expectSocketRejected(auth) {
  return new Promise((resolve, reject) => {
    const socket = io(BASE_URL, {
      autoConnect: false,
      reconnection: false,
      timeout: 5000,
      forceNew: true,
      auth,
    });

    let settled = false;

    function cleanup() {
      socket.off("connect_error", onConnectError);
      socket.off("connect", onConnect);
      socket.disconnect();
    }

    function onConnectError(error) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      cleanup();
      resolve(error);
    }

    function onConnect() {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      cleanup();
      reject(
        new Error("Socket.IO unexpectedly accepted an unauthenticated connection.")
      );
    }

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(
        new Error("Timed out waiting for Socket.IO authentication rejection.")
      );
    }, 7000);

    socket.once("connect_error", onConnectError);
    socket.once("connect", onConnect);

    socket.connect();
  });
}

test("Socket.IO rejects connections without a token", async () => {
  const error = await expectSocketRejected({});

  assert.match(error.message, /auth|token|session|expired|invalid/i);
});

test("Socket.IO rejects connections with an invalid token", async () => {
  const error = await expectSocketRejected({
    token: "invalid-socket-token-for-test",
  });

  assert.match(error.message, /auth|token|session|expired|invalid/i);
});
