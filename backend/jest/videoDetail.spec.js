import express from "express";
import request from "supertest";
import "dotenv/config";
import mongoose from "mongoose";
import User from "../src/models/User.model.js";
import Video from "../src/models/Video.model.js";
import { generateToken } from "../src/utils/createToken.js";
import cookieParser from "cookie-parser";

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
  let publicVideoId;
  let nonOwnerUserId;
  let adminUserId;
  let processingVideoId;
  let fixtureSearchTag;
  const originalJwtSecret = process.env.JWT_SECRET;

  beforeAll(async () => {
    process.env.JWT_SECRET = "p01-video-detail-test-secret";
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

    if (originalJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalJwtSecret;
    }
  });

  beforeEach(async () => {
    const suffix = new mongoose.Types.ObjectId().toString().slice(-8);
    fixtureSearchTag = suffix;

    const user = await User.create({
      username: `p01_${suffix}`,
      email: `p01_${suffix}@example.test`,
      displayName: "P01 Test User",
      avatar: "https://example.test/avatar.png",
      streamKey: `p01_owner_stream_${suffix}`,
    });

    fixtureUserId = user._id;

    const video = await Video.create({
      userId: user._id,
      title: "P01 Private Video",
      description: `Private visibility regression fixture ${suffix}`,
      category: "test",
      status: "private",
      videoUrl: "https://example.test/private-video.mp4",
    });

    privateVideoId = video._id;

    const publicVideo = await Video.create({
      userId: user._id,
      title: "P01 Public Video",
      description: `Public visibility regression fixture ${suffix}`,
      category: "test",
      status: "public",
      videoUrl: "https://example.test/public-video.mp4",
    });

    publicVideoId = publicVideo._id;

    const processingVideo = await Video.create({
      userId: user._id,
      title: "P01 Processing Video",
      description: `Processing visibility regression fixture ${suffix}`,
      category: "test",
      status: "processing",
      videoUrl: "https://example.test/processing-video.mp4",
    });

    processingVideoId = processingVideo._id;

    const nonOwnerUser = await User.create({
      username: `p01_non_owner_${suffix}`,
      email: `p01_non_owner_${suffix}@example.test`,
      displayName: "P01 Non Owner",
      avatar: "https://example.test/non-owner-avatar.png",
      streamKey: `p01_non_owner_stream_${suffix}`,
    });

    nonOwnerUserId = nonOwnerUser._id;

    const adminUser = await User.create({
      username: `p01_admin_${suffix}`,
      email: `p01_admin_${suffix}@example.test`,
      displayName: "P01 Admin",
      role: "admin",
      streamKey: `p01_admin_stream_${suffix}`,
    });

    adminUserId = adminUser._id;
  });

  afterEach(async () => {
    if (privateVideoId) {
      await Video.deleteOne({ _id: privateVideoId });
    }

    if (publicVideoId) {
      await Video.deleteOne({ _id: publicVideoId });
    }

    if (processingVideoId) {
      await Video.deleteOne({ _id: processingVideoId });
    }

    if (nonOwnerUserId) {
      await User.deleteOne({ _id: nonOwnerUserId });
    }

    if (adminUserId) {
      await User.deleteOne({ _id: adminUserId });
    }

    if (fixtureUserId) {
      await User.deleteOne({ _id: fixtureUserId });
    }

    privateVideoId = undefined;
    publicVideoId = undefined;
    processingVideoId = undefined;
    nonOwnerUserId = undefined;
    adminUserId = undefined;
    fixtureUserId = undefined;
    fixtureSearchTag = undefined;
  });

  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api/v1/videos", videoRoute);

  test("Jest request harness can mount the real video route", async () => {
    const response = await request(app).get("/__p01_probe__");

    expect(response.status).toBe(404);
  });

  test("creates an isolated private video fixture", async () => {
    const user = await User.findById(fixtureUserId);
    const video = await Video.findById(privateVideoId);

    expect(user).not.toBeNull();
    expect(video).not.toBeNull();

    expect(video.status).toBe("private");
    expect(video.userId.toString()).toBe(fixtureUserId.toString());
    expect(video.videoUrl).toBe("https://example.test/private-video.mp4");
  });

  test("anonymous cannot read a private video", async () => {
    const response = await request(app).get(`/api/v1/videos/${privateVideoId}`);

    expect(JSON.stringify(response.body)).not.toContain(
      "https://example.test/private-video.mp4",
    );
    expect(response.status).toBe(404);
  });

  test("anonymous can read a public video", async () => {
    const response = await request(app).get(`/api/v1/videos/${publicVideoId}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        _id: publicVideoId.toString(),
        title: "P01 Public Video",
        status: "public",
        userId: expect.objectContaining({
          _id: fixtureUserId.toString(),
          username: expect.any(String),
          displayName: "P01 Test User",
        }),
      }),
    );
    expect(response.body.videoUrl).toBe(
      "https://example.test/public-video.mp4",
    );
    expect(response.body.userId).not.toHaveProperty("streamKey");
  });

  test("authenticated non-owner can read a public video", async () => {
    const token = generateToken(nonOwnerUserId);

    const response = await request(app)
      .get(`/api/v1/videos/${publicVideoId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body._id).toBe(publicVideoId.toString());
    expect(response.body.videoUrl).toBe(
      "https://example.test/public-video.mp4",
    );
  });

  test("authenticated non-owner cannot read a private video", async () => {
    const token = generateToken(nonOwnerUserId);

    const response = await request(app)
      .get(`/api/v1/videos/${privateVideoId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(JSON.stringify(response.body)).not.toContain(
      "https://example.test/private-video.mp4",
    );
  });

  test("admin can read a public video", async () => {
    const token = generateToken(adminUserId);

    const response = await request(app)
      .get(`/api/v1/videos/${publicVideoId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body._id).toBe(publicVideoId.toString());
    expect(response.body.videoUrl).toBe(
      "https://example.test/public-video.mp4",
    );
  });

  test("admin cannot read another user's private video through content detail", async () => {
    const token = generateToken(adminUserId);

    const response = await request(app)
      .get(`/api/v1/videos/${privateVideoId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(JSON.stringify(response.body)).not.toContain(
      "https://example.test/private-video.mp4",
    );
  });

  test("admin cannot read a processing video through content detail", async () => {
    const token = generateToken(adminUserId);

    const response = await request(app)
      .get(`/api/v1/videos/${processingVideoId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(JSON.stringify(response.body)).not.toContain(
      "https://example.test/processing-video.mp4",
    );
  });

  test("owner can read their own private video", async () => {
    const token = generateToken(fixtureUserId);

    const response = await request(app)
      .get(`/api/v1/videos/${privateVideoId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body._id).toBe(privateVideoId.toString());
    expect(response.body.videoUrl).toBe(
      "https://example.test/private-video.mp4",
    );
  });

  test("owner cannot read their own processing video", async () => {
    const token = generateToken(fixtureUserId);

    const response = await request(app)
      .get(`/api/v1/videos/${processingVideoId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(JSON.stringify(response.body)).not.toContain(
      "https://example.test/processing-video.mp4",
    );
  });

  test("processing video is not readable", async () => {
    const response = await request(app).get(
      `/api/v1/videos/${processingVideoId}`,
    );

    expect(response.status).toBe(404);
    expect(JSON.stringify(response.body)).not.toContain(
      "https://example.test/processing-video.mp4",
    );
  });

  test("anonymous general and creator lists expose only the public fixture", async () => {
    const paths = [
      "/api/v1/videos?limit=50",
      `/api/v1/videos/user/${fixtureUserId}?limit=50`,
    ];

    for (const path of paths) {
      const response = await request(app).get(path);

      expect(response.status).toBe(200);
      const videos = response.body.videos;
      const ids = videos.map((video) => video._id);

      expect(ids).toContain(publicVideoId.toString());
      expect(ids).not.toContain(privateVideoId.toString());
      expect(ids).not.toContain(processingVideoId.toString());
      expect(videos.every((video) => video.status === "public")).toBe(true);
    }
  });

  test("anonymous search exposes the public fixture but not its private or processing peers", async () => {
    const response = await request(app)
      .get("/api/v1/videos/search")
      .query({ q: fixtureSearchTag });

    expect(response.status).toBe(200);
    const ids = response.body.videos.map((video) => video._id);

    expect(ids).toContain(publicVideoId.toString());
    expect(ids).not.toContain(privateVideoId.toString());
    expect(ids).not.toContain(processingVideoId.toString());
  });

  test("missing video returns 404", async () => {
    const missingVideoId = new mongoose.Types.ObjectId();

    const response = await request(app).get(`/api/v1/videos/${missingVideoId}`);

    expect(response.status).toBe(404);
  });

  test("invalid token returns 401 instead of falling back to anonymous", async () => {
    const response = await request(app)
      .get(`/api/v1/videos/${publicVideoId}`)
      .set("Authorization", "Bearer invalid-token");

    expect(response.status).toBe(401);
  });

  test("invalid JWT cookie returns 401 instead of falling back to anonymous", async () => {
    const response = await request(app)
      .get(`/api/v1/videos/${publicVideoId}`)
      .set("Cookie", ["jwt=invalid-token"]);

    expect(response.status).toBe(401);
  });

  test("valid JWT for an inactive user returns 401", async () => {
    const token = generateToken(fixtureUserId);
    const result = await User.updateOne(
      { _id: fixtureUserId },
      { $set: { isActive: false } },
    );
    expect(result.modifiedCount).toBe(1);

    const response = await request(app)
      .get(`/api/v1/videos/${publicVideoId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(401);
  });

  test("valid JWT for a missing user returns 401", async () => {
    const token = generateToken(new mongoose.Types.ObjectId());

    const response = await request(app)
      .get(`/api/v1/videos/${publicVideoId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(401);
  });

  test("owner can read their own private video via auth cookie", async () => {
    const token = generateToken(fixtureUserId);

    const response = await request(app)
      .get(`/api/v1/videos/${privateVideoId}`)
      .set("Cookie", [`jwt=${token}`]);

    expect(response.status).toBe(200);
    expect(response.body.videoUrl).toBe(
      "https://example.test/private-video.mp4",
    );
  });

  test("malformed authorization header returns 401 instead of falling back to anonymous", async () => {
    const response = await request(app)
      .get(`/api/v1/videos/${publicVideoId}`)
      .set("Authorization", "Bearer");

    expect(response.status).toBe(401);
  });
});
