
const test = require("node:test");
const assert = require("node:assert/strict");

const BASE_URL =
  process.env.TEST_BASE_URL || "http://127.0.0.1:3000";

test("homepage loads successfully", async () => {
  const response = await fetch(`${BASE_URL}/`);
  assert.equal(response.status, 200);
});

test("calendar page loads successfully", async () => {
  const response = await fetch(`${BASE_URL}/calendar.html`);
  assert.equal(response.status, 200);
});

test("notes page loads successfully", async () => {
  const response = await fetch(`${BASE_URL}/habit.html`);
  assert.equal(response.status, 200);
});

test("task management page loads successfully", async () => {
  const response = await fetch(`${BASE_URL}/taskmanagment.html`);
  assert.equal(response.status, 200);
});

test("chat page loads successfully", async () => {
  const response = await fetch(`${BASE_URL}/chat_main.html`);
  assert.equal(response.status, 200);
});

test("protected user API rejects missing tokens", async () => {
  const response = await fetch(`${BASE_URL}/getUser`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "",
  });

  assert.equal(response.status, 401);
});

test("protected user API rejects invalid tokens", async () => {
  const response = await fetch(`${BASE_URL}/getUser`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      accessToken: "invalid-token-for-test",
    }),
  });

  assert.equal(response.status, 401);
});
