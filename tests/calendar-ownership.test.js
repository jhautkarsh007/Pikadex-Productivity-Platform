
const test = require("node:test");
const assert = require("node:assert/strict");

const BASE_URL =
  process.env.TEST_BASE_URL || "http://127.0.0.1:3000";

const EMAIL_A = process.env.TEST_USER_A_EMAIL;
const PASSWORD_A = process.env.TEST_USER_A_PASSWORD;
const EMAIL_B = process.env.TEST_USER_B_EMAIL;
const PASSWORD_B = process.env.TEST_USER_B_PASSWORD;

const credentialsAvailable = Boolean(
  EMAIL_A && PASSWORD_A && EMAIL_B && PASSWORD_B
);

const hostname = new URL(BASE_URL).hostname;
const isLocalServer = [
  "localhost",
  "127.0.0.1",
  "::1",
].includes(hostname);

async function postForm(path, fields = {}) {
  const formData = new FormData();

  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, String(value ?? ""));
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    body: formData,
  });

  const raw = await response.text();

  let body;

  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error(`${path} returned invalid JSON.`);
  }

  return {
    status: response.status,
    body,
  };
}

async function login(email, password) {
  const result = await postForm("/login", {
    email,
    password,
  });

  if (
    result.status !== 200 ||
    result.body.status !== "success" ||
    !result.body.accessToken
  ) {
    throw new Error("A dedicated test account could not log in.");
  }

  return result.body.accessToken;
}

async function api(path, token, fields = {}) {
  return postForm(path, {
    ...fields,
    accessToken: token,
  });
}

test(
  "Notes, Calendar, and Tasks enforce per-account data isolation",
  {
    skip: !credentialsAvailable || !isLocalServer,
  },
  async () => {
    // Log in only once per test account.
    const tokenA = await login(EMAIL_A, PASSWORD_A);
    const tokenB = await login(EMAIL_B, PASSWORD_B);

    const unique = `ownership-test-${Date.now()}`;
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 2);
    const date = futureDate.toISOString().slice(0, 10);

    let noteId = null;
    let eventId = null;
    let originalProjectsA = null;
    let projectsWereChanged = false;

    try {
      // -------------------------------------------------
      // NOTES: create as A, verify B cannot access them.
      // -------------------------------------------------

      const createdNote = await api(
        "/api/notes/create",
        tokenA,
        {
          title: unique,
          content: "Private ownership test note",
        }
      );

      assert.equal(createdNote.status, 201);
      assert.equal(createdNote.body.status, "success");

      noteId = createdNote.body.noteId;
      assert.ok(noteId, "Created note should return an ID");

      const notesB = await api(
        "/api/notes/list",
        tokenB
      );

      assert.equal(notesB.status, 200);
      assert.equal(notesB.body.status, "success");

      assert.equal(
        notesB.body.data.some((note) => note._id === noteId),
        false,
        "Account B must not read Account A's note"
      );

      const updateNoteB = await api(
        "/api/notes/update",
        tokenB,
        {
          noteId,
          title: "Unauthorized edit",
          content: "This edit must not be applied",
        }
      );

      assert.equal(updateNoteB.status, 404);

      const deleteNoteB = await api(
        "/api/notes/delete",
        tokenB,
        { noteId }
      );

      assert.equal(deleteNoteB.status, 404);

      // -------------------------------------------------
      // CALENDAR: create as A, verify B cannot access it.
      // -------------------------------------------------

      const createdEvent = await api(
        "/api/calendar/create",
        tokenA,
        {
          title: unique,
          date,
          time: "10:00",
          category: "Study",
          description: "Private ownership test event",
        }
      );

      assert.equal(createdEvent.status, 201);
      assert.equal(createdEvent.body.status, "success");

      eventId = createdEvent.body.data.id;
      assert.ok(eventId, "Created event should return an ID");

      const calendarB = await api(
        "/api/calendar/list",
        tokenB
      );

      assert.equal(calendarB.status, 200);
      assert.equal(calendarB.body.status, "success");

      assert.equal(
        calendarB.body.data.some((event) => event.id === eventId),
        false,
        "Account B must not read Account A's event"
      );

      const updateEventB = await api(
        "/api/calendar/update",
        tokenB,
        {
          eventId,
          title: "Unauthorized edit",
          date,
          time: "11:00",
          category: "Study",
          description: "This edit must not be applied",
        }
      );

      assert.equal(updateEventB.status, 404);

      const deleteEventB = await api(
        "/api/calendar/delete",
        tokenB,
        { eventId }
      );

      assert.equal(deleteEventB.status, 404);

      // -------------------------------------------------
      // TASKS: temporarily append a marker project for A.
      // Save and restore A's original projects afterward.
      // -------------------------------------------------

      const loadedA = await api(
        "/api/tasks/load",
        tokenA
      );

      assert.equal(loadedA.status, 200);
      assert.equal(loadedA.body.status, "success");
      assert.ok(Array.isArray(loadedA.body.data));

      originalProjectsA = loadedA.body.data;

      const markerProject = {
        id: Date.now(),
        name: unique,
        tasks: [],
      };

      const saveA = await api(
        "/api/tasks/save",
        tokenA,
        {
          projects: JSON.stringify([
            ...originalProjectsA,
            markerProject,
          ]),
        }
      );

      assert.equal(saveA.status, 200);
      assert.equal(saveA.body.status, "success");
      projectsWereChanged = true;

      const loadedB = await api(
        "/api/tasks/load",
        tokenB
      );

      assert.equal(loadedB.status, 200);
      assert.equal(loadedB.body.status, "success");

      assert.equal(
        loadedB.body.data.some(
          (project) => project.name === unique
        ),
        false,
        "Account B must not read Account A's project"
      );

      // Verify A still sees the project it created.
      const reloadedA = await api(
        "/api/tasks/load",
        tokenA
      );

      assert.equal(reloadedA.status, 200);

      assert.equal(
        reloadedA.body.data.some(
          (project) => project.name === unique
        ),
        true,
        "Account A should see its own project"
      );
    } finally {
      // Best-effort cleanup of the note and event created by A.
      if (noteId) {
        await api(
          "/api/notes/delete",
          tokenA,
          { noteId }
        ).catch(() => {});
      }

      if (eventId) {
        await api(
          "/api/calendar/delete",
          tokenA,
          { eventId }
        ).catch(() => {});
      }

      // Restore Account A's task list to its original state.
      if (projectsWereChanged && originalProjectsA) {
        const restored = await api(
          "/api/tasks/save",
          tokenA,
          {
            projects: JSON.stringify(originalProjectsA),
          }
        );

        assert.equal(
          restored.status,
          200,
          "Account A's original projects should be restored"
        );
      }
    }
  }
);
