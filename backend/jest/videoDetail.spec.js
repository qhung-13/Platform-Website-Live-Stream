import express from "express";
import request from "supertest";
import "dotenv/config";
import mongoose from "mongoose";
import User from "../src/models/User.model.js";
import Video from "../src/models/Video.model.js";

import videoRoute from "../src/routes/VideoRoute.route.js";

function getTestMongoUri() {
  const testUri = process.env.MONGO_TEST_URI;

  if (!testUri) {
    throw new Error("MONGO_TEST_URI is required for Jest integration tests");
  }

  if (testUri === process.env.MONGO_URI) {
    throw new Error("MONGO_TEST_URI must not be the same as MONGO_URI");
  }

  if (!/\/[^/?#]*_test(?:[?#]|$)/.test(testUri)) {
    throw new Error(
      "MONGO_TEST_URI must point to a database whose name ends with _test",
    );
  }

  return testUri;
}

describe("GET /api/v1/videos/:id", () => {
  let fixtureUserId;
  let privateVideoId;

  beforeAll(async () => {
    await mongoose.connect(getTestMongoUri());

    const databaseName = mongoose.connection.db?.databaseName;

    if (!databaseName?.endsWith("_test")) {
      await mongoose.disconnect();
      throw new Error(
        `Refusing to run integration tests against non-test database: ${databaseName}`,
      );
    }
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    const suffix = new mongoose.Types.ObjectId().toString().slice(-8);

    const user = await User.create({
      username: `p01_${suffix}`,
      email: `p01_${suffix}@example.test`,
      displayName: "P01 Test User",
      avatar: "https://example.test/avatar.png",
    });

    fixtureUserId = user._id;

    const video = await Video.create({
      userId: user._id,
      title: "P01 Private Video",
      description: "Private visibility regression fixture",
      category: "test",
      status: "private",
      videoUrl: "https://example.test/private-video.mp4",
    });

    privateVideoId = video._id;
  });

  afterEach(async () => {
    if (privateVideoId) {
      await Video.deleteOne({ _id: privateVideoId });
    }

    if (fixtureUserId) {
      await User.deleteOne({ _id: fixtureUserId });
    }

    privateVideoId = undefined;
    fixtureUserId = undefined;
  });

  const app = express();

  app.use(express.json());
  app.use("/api/v1/videos", videoRoute);

  test("Jest request harness can mount the real video route", async () => {
    const response = await request(app).get("/__p01_probe__");

    expect(response.status).toBe(404);
  });

  test("creates an isolated private video fixture", async() => {
    const user = await User.findById(fixtureUserId);
    const video = await Video.findById(privateVideoId);

    expect(user).not.toBeNull();
    expect(video).not.toBeNull();

    expect(video.status).toBe("private");
    expect(video.userId.toString()).toBe(fixtureUserId.toString());
    expect(video.videoUrl).toBe("https://example.test/private-video.mp4",);
  });

  test("anonymous cannot read a private video", async () => {
    const response = await request(app).get(`/api/v1/videos/${privateVideoId}`);

    expect(JSON.stringify(response.body)).not.toContain(
      "https://example.test/private-video.mp4",
    );
    expect(response.status).not.toBe(200);
  });
});
