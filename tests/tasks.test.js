
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
    body: formData
  });
}

const taskEndpoints = [
  {
    name: "load",
    path: "/api/tasks/load",
    fields: {}
  },
  {
    name: "save",
    path: "/api/tasks/save",
    fields: {
      projects: "[]"
    }
  }
];

for (const endpoint of taskEndpoints) {
  test(
    `Task API ${endpoint.name} rejects missing authentication`,
    async () => {
      const response = await postForm(
        endpoint.path,
        endpoint.fields
      );

      assert.equal(response.status, 401);

      const result = await response.json();
      assert.equal(result.status, "error");
    }
  );

  test(
    `Task API ${endpoint.name} rejects an invalid token`,
    async () => {
      const response = await postForm(endpoint.path, {
        ...endpoint.fields,
        accessToken: "invalid-task-test-token"
      });

      assert.equal(response.status, 401);

      const result = await response.json();
      assert.equal(result.status, "error");
    }
  );
}
