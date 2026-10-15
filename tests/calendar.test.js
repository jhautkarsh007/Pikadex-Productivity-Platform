
const test = require("node:test");
const assert = require("node:assert/strict");

const BASE_URL =
  process.env.TEST_BASE_URL || "http://127.0.0.1:3000";

async function postForm(path, fields = {}) {
  const formData = new FormData();

  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }

  return fetch(`${BASE_URL}${path}`, {
    method: "POST",
    body: formData,
  });
}

const calendarEndpoints = [
  {
    name: "list",
    path: "/api/calendar/list",
    fields: {},
  },
  {
    name: "create",
    path: "/api/calendar/create",
    fields: {
      title: "Test event",
      date: "2026-12-15",
      time: "10:00",
      category: "Study",
      description: "Authentication test",
    },
  },
  {
    name: "update",
    path: "/api/calendar/update",
    fields: {
      eventId: "000000000000000000000001",
      title: "Updated test event",
      date: "2026-12-15",
      time: "10:00",
      category: "Study",
      description: "Authentication test",
    },
  },
  {
    name: "delete",
    path: "/api/calendar/delete",
    fields: {
      eventId: "000000000000000000000001",
    },
  },
];

for (const endpoint of calendarEndpoints) {
  test(`Calendar ${endpoint.name} rejects missing authentication`, async () => {
    const response = await postForm(
      endpoint.path,
      endpoint.fields
    );

    assert.equal(response.status, 401);

    const result = await response.json();
    assert.equal(result.status, "error");
  });

  test(`Calendar ${endpoint.name} rejects an invalid token`, async () => {
    const response = await postForm(endpoint.path, {
      ...endpoint.fields,
      accessToken: "invalid-token-for-calendar-test",
    });

    assert.equal(response.status, 401);

    const result = await response.json();
    assert.equal(result.status, "error");
  });
}
