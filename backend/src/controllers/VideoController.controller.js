import mongoose from "mongoose";
import Video from "../models/Video.model.js";
import Comment from "../models/Comment.model.js";
import asyncHandler from "../middlewares/AsyncHandler.middleware.js";
import destroyCloudinaryAsset from "../utils/cloudinaryAssets.js";
import { cloudinary } from "../config/cloudinary.config.js";

const VIEW_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_VIEW_SESSIONS = 100_000;
const viewedSessions = new Map();
const cleanupViewSessions = () => {
  const now = Date.now();
  for (const [key, expiresAt] of viewedSessions) {
    if (expiresAt <= now) viewedSessions.delete(key);
  }
};
setInterval(cleanupViewSessions, 60 * 60 * 1000).unref();

const paginationFrom = (query) => {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(
    50,
    Math.max(1, Number.parseInt(query.limit, 10) || 12),
  );
  return { page, limit, skip: (page - 1) * limit };
};

const parseTags = (value) => {
  const raw = Array.isArray(value) ? value : String(value || "").split(",");
  return [...new Set(raw.map((tag) => String(tag).trim()).filter(Boolean))]
    .slice(0, 10)
    .map((tag) => tag.slice(0, 30));
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const createVideo = asyncHandler(async (req, res) => {
  const title = String(req.body.title || "").trim();
  const description = String(req.body.description || "").trim();
  const category = String(req.body.category || "").trim();
  const type = String(req.body.type || "vod")
    .trim()
    .toLowerCase();
  const videoUrl = req.file?.path;
  const videoPublicId = req.file?.filename;

  if (!["clip", "vod"].includes(type)) {
    await destroyCloudinaryAsset(videoPublicId, "video");
    res.status(400);
    throw new Error("Video type must be either clip or vod");
  }

  if (!title || !description || !category) {
    await destroyCloudinaryAsset(videoPublicId, "video");
    res.status(400);
    throw new Error("Title, description, and category are required");
  }
  if (!videoUrl || !videoPublicId) {
    res.status(400);
    throw new Error("Please upload a video");
  }

  let duration;
  try {
    const uploadedResource = await cloudinary.api.resource(videoPublicId, {
      resource_type: "video",
    });
    duration = Number(uploadedResource.duration);
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new Error("Cloudinary did not return a valid video duration");
    }
  } catch (error) {
    await destroyCloudinaryAsset(videoPublicId, "video");
    const metadataError = new Error(
      `Could not verify uploaded video metadata: ${error.message}`,
    );
    metadataError.statusCode = 502;
    throw metadataError;
  }

  try {
    const video = await Video.create({
      userId: req.user._id,
      title: title.slice(0, 150),
      description: description.slice(0, 2000),
      videoUrl,
      videoPublicId,
      duration,
      category: category.slice(0, 60),
      tags: parseTags(req.body.tags),
      type,
      status: "public",
    });
    res.status(201).json(video);
  } catch (error) {
    await destroyCloudinaryAsset(videoPublicId, "video");
    throw error;
  }
});

const listVideos = async (filter, req, res) => {
  const { page, limit, skip } = paginationFrom(req.query);
  const [videos, total] = await Promise.all([
    Video.find(filter)
      .populate("userId", "username displayName avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Video.countDocuments(filter),
  ]);
  const totalPages = Math.ceil(total / limit);
  res.status(200).json({
    videos,
    pagination: { page, limit, total, totalPages, hasMore: page < totalPages },
  });
};

const getVideos = asyncHandler(async (req, res) =>
  listVideos({ status: "public" }, req, res),
);

const getVideoById = asyncHandler(async (req, res) => {
  const visibilityConditions = [{ status: "public" }];

  if (req.user) {
    visibilityConditions.push({
      status: "private",
      userId: req.user._id,
    });
  }

  const video = await Video.findOne({
    _id: req.params.id,
    $or: visibilityConditions,
  }).populate("userId", "username displayName avatar");
  if (!video) {
    res.status(404);
    throw new Error("Video not found");
  }
  res.status(200).json(video);
});

const increaseView = asyncHandler(async (req, res) => {
  const videoId = req.params.id;
  const identifier = `${req.ip || "unknown"}:${videoId}`;
  const currentExpiry = viewedSessions.get(identifier);
  if (currentExpiry && currentExpiry > Date.now()) {
    return res.status(200).json({ success: true, skipped: true });
  }

  const video = await Video.findOneAndUpdate(
    { _id: videoId, status: "public" },
    { $inc: { views: 1 } },
    { new: true },
  ).select("views");
  if (!video) {
    res.status(404);
    throw new Error("Video not found");
  }
  viewedSessions.set(identifier, Date.now() + VIEW_TTL_MS);
  cleanupViewSessions();
  while (viewedSessions.size > MAX_VIEW_SESSIONS) {
    const oldestKey = viewedSessions.keys().next().value;
    if (!oldestKey) break;
    viewedSessions.delete(oldestKey);
  }
  res.status(200).json({ success: true, views: video.views });
});

const getVideosByUser = asyncHandler(async (req, res) =>
  listVideos({ userId: req.params.userId, status: "public" }, req, res),
);

const updateVideo = asyncHandler(async (req, res) => {
  const video = await Video.findById(req.params.id);
  if (!video) {
    res.status(404);
    throw new Error("Video not found");
  }
  if (
    video.userId.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    res.status(403);
    throw new Error("Not authorized to update this video");
  }

  if (Object.hasOwn(req.body, "title")) {
    const title = String(req.body.title || "").trim();
    if (!title) {
      res.status(400);
      throw new Error("Title cannot be empty");
    }
    video.title = title.slice(0, 150);
  }
  if (Object.hasOwn(req.body, "description")) {
    video.description = String(req.body.description || "")
      .trim()
      .slice(0, 2000);
  }
  if (Object.hasOwn(req.body, "category")) {
    const category = String(req.body.category || "").trim();
    if (!category) {
      res.status(400);
      throw new Error("Category cannot be empty");
    }
    video.category = category.slice(0, 60);
  }
  if (Object.hasOwn(req.body, "tags")) video.tags = parseTags(req.body.tags);
  const previousThumbnailPublicId = video.thumbnailPublicId;
  const newThumbnailPublicId = req.file?.filename;
  if (req.file?.path) {
    video.thumbnailUrl = req.file.path;
    video.thumbnailPublicId = newThumbnailPublicId;
  }
  if (Object.hasOwn(req.body, "status")) {
    if (!["public", "private"].includes(req.body.status)) {
      res.status(400);
      throw new Error("Invalid video status");
    }
    video.status = req.body.status;
  }

  try {
    await video.save();
  } catch (error) {
    await destroyCloudinaryAsset(newThumbnailPublicId, "image");
    throw error;
  }
  if (
    newThumbnailPublicId &&
    previousThumbnailPublicId !== newThumbnailPublicId
  ) {
    await destroyCloudinaryAsset(previousThumbnailPublicId, "image");
  }
  res.status(200).json(video);
});

const deleteVideo = asyncHandler(async (req, res) => {
  const video = await Video.findById(req.params.id);
  if (!video) {
    res.status(404);
    throw new Error("Video not found");
  }
  if (
    video.userId.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    res.status(403);
    throw new Error("Not authorized to delete this video");
  }

  const dependentClips =
    video.type === "vod"
      ? await Video.find({ sourceVideoId: video._id }).select("_id")
      : [];
  const videoIds = [video._id, ...dependentClips.map((clip) => clip._id)];

  await Promise.all([
    Video.deleteMany({ _id: { $in: videoIds } }),
    Comment.deleteMany({ videoId: { $in: videoIds } }),
  ]);
  await Promise.all([
    destroyCloudinaryAsset(video.videoPublicId, "video"),
    destroyCloudinaryAsset(video.thumbnailPublicId, "image"),
  ]);
  res.status(200).json({ message: "Video deleted successfully" });
});

const updateReaction = async (videoId, userId, action) => {
  const objectId = new mongoose.Types.ObjectId(userId);
  let likesExpression = "$likes";
  let dislikesExpression = "$dislikes";

  if (action === "like") {
    likesExpression = { $setUnion: ["$likes", [objectId]] };
    dislikesExpression = { $setDifference: ["$dislikes", [objectId]] };
  } else if (action === "unlike") {
    likesExpression = { $setDifference: ["$likes", [objectId]] };
  } else if (action === "dislike") {
    dislikesExpression = { $setUnion: ["$dislikes", [objectId]] };
    likesExpression = { $setDifference: ["$likes", [objectId]] };
  } else if (action === "undislike") {
    dislikesExpression = { $setDifference: ["$dislikes", [objectId]] };
  }

  return Video.findByIdAndUpdate(
    videoId,
    [
      { $set: { likes: likesExpression, dislikes: dislikesExpression } },
      {
        $set: {
          likesCount: { $size: "$likes" },
          dislikesCount: { $size: "$dislikes" },
        },
      },
    ],
    { new: true },
  ).select("likes dislikes likesCount dislikesCount");
};

const reactionHandler = (action, successMessage) =>
  asyncHandler(async (req, res) => {
    const video = await updateReaction(req.params.id, req.user._id, action);
    if (!video) {
      res.status(404);
      throw new Error("Video not found");
    }
    res.status(200).json({ message: successMessage, ...video.toObject() });
  });

const likeVideo = reactionHandler("like", "Video liked successfully");
const unlikeVideo = reactionHandler("unlike", "Video unliked successfully");
const dislikeVideo = reactionHandler("dislike", "Video disliked successfully");
const undislikeVideo = reactionHandler(
  "undislike",
  "Video undisliked successfully",
);

const searchVideos = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationFrom(req.query);
  const query = { status: "public" };
  const searchText = String(req.query.q || "")
    .trim()
    .slice(0, 100);
  const category = String(req.query.category || "")
    .trim()
    .slice(0, 60);

  if (searchText) {
    const safePattern = escapeRegex(searchText);
    query.$or = [
      { title: { $regex: safePattern, $options: "i" } },
      { description: { $regex: safePattern, $options: "i" } },
    ];
  }
  if (category) query.category = category;

  const allowedSorts = {
    views: { views: -1 },
    likes: { likesCount: -1 },
    oldest: { createdAt: 1 },
    newest: { createdAt: -1 },
  };
  const sortOption = allowedSorts[req.query.sort] || allowedSorts.newest;

  const [videos, total] = await Promise.all([
    Video.find(query)
      .populate("userId", "username displayName avatar")
      .sort(sortOption)
      .skip(skip)
      .limit(limit),
    Video.countDocuments(query),
  ]);
  const totalPages = Math.ceil(total / limit);
  res.status(200).json({
    videos,
    pagination: { page, limit, total, totalPages, hasMore: page < totalPages },
  });
});

export {
  createVideo,
  getVideos,
  getVideoById,
  getVideosByUser,
  updateVideo,
  deleteVideo,
  likeVideo,
  unlikeVideo,
  searchVideos,
  dislikeVideo,
  undislikeVideo,
  increaseView,
};
