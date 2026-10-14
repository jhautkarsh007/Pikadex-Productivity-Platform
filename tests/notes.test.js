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

const notesEndpoints = [
  {
    name: "list",
    path: "/api/notes/list",
    fields: {},
  },
  {
    name: "create",
    path: "/api/notes/create",
    fields: {
      title: "Test note",
      content: "This should not be saved without authentication",
    },
  },
  {
    name: "update",
    path: "/api/notes/update",
    fields: {
      noteId: "000000000000000000000001",
      title: "Updated test note",
      content: "Unauthorized update attempt",
    },
  },
  {
    name: "delete",
    path: "/api/notes/delete",
    fields: {
      noteId: "000000000000000000000001",
    },
  },
];

for (const endpoint of notesEndpoints) {
  test(`Notes ${endpoint.name} rejects missing authentication`, async () => {
    const response = await postForm(
      endpoint.path,
      endpoint.fields
    );

    assert.equal(response.status, 401);

    const result = await response.json();
    assert.equal(result.status, "error");
  });
}

test("Notes API rejects an invalid token", async () => {
  const response = await postForm("/api/notes/list", {
    accessToken: "invalid-token-for-automated-test",
  });

  assert.equal(response.status, 401);

  const result = await response.json();
  assert.equal(result.status, "error");
});