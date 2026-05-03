import assert from "node:assert/strict";
import test from "node:test";
import { buildApiUrl, outfitApiEndpoints } from "../src/lib/api-endpoints.ts";

test("buildApiUrl joins the backend base URL and outfit API path", () => {
  assert.equal(
    buildApiUrl("/api/generate-outfit", "https://api.example.com/"),
    "https://api.example.com/api/generate-outfit",
  );
});

test("buildApiUrl uses localhost api-server as the default backend", () => {
  assert.equal(
    buildApiUrl("/api/generate-outfit/task-1/events"),
    "http://localhost:9200/api/generate-outfit/task-1/events",
  );
});

test("h5 profile overview endpoint uses the logged-in user session", () => {
  assert.equal(
    outfitApiEndpoints.h5ProfileOverview("https://api.example.com"),
    "https://api.example.com/api/h5/profile/overview",
  );
});

test("h5 style archive endpoint is separate from account settings", () => {
  assert.equal(
    outfitApiEndpoints.h5ProfileArchive("https://api.example.com"),
    "https://api.example.com/api/h5/profile/archive",
  );
});

test("h5 profile feedback endpoint records result preferences", () => {
  assert.equal(
    outfitApiEndpoints.h5ProfileFeedback("https://api.example.com"),
    "https://api.example.com/api/h5/profile/feedback",
  );
});
