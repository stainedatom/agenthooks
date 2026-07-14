import { Router, Request, Response } from "express";
import { ObjectId } from "mongodb";
import mongoclient from "../dbclient";
import { authenticateToken } from "../middleware/auth";

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// POST /api/collections — Create collection
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, endpointIds } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      res.status(400).json({ error: "BadRequest", message: "name is required" });
      return;
    }

    // Convert string endpointIds to ObjectIds if provided
    let resolvedEndpointIds: ObjectId[] = [];
    if (Array.isArray(endpointIds)) {
      resolvedEndpointIds = endpointIds
        .filter((id) => typeof id === "string" && ObjectId.isValid(id))
        .map((id) => new ObjectId(id));
    }

    const db = mongoclient.db("agenthooks");
    const collection = db.collection("endpoint_collections");

    const doc = {
      userId: req.user,
      name: name.trim(),
      description: description || "",
      endpointIds: resolvedEndpointIds,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collection.insertOne(doc);

    res.status(201).json({
      _id: result.insertedId.toString(),
      userId: doc.userId,
      name: doc.name,
      description: doc.description,
      endpointIds: doc.endpointIds.map((id) => id.toString()),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  } catch (err) {
    console.error("Create collection error:", err);
    res.status(500).json({ error: "InternalServerError", message: "Something went wrong" });
  }
});

// GET /api/collections — List user's collections
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const db = mongoclient.db("agenthooks");
    const collection = db.collection("endpoint_collections");

    const collections = await collection
      .find({ userId: req.user })
      .sort({ createdAt: -1 })
      .toArray();

    res.json(
      collections.map((col) => ({
        ...col,
        _id: col._id.toString(),
        endpointIds: Array.isArray(col.endpointIds)
          ? col.endpointIds.map((id: any) => id.toString())
          : [],
      }))
    );
  } catch (err) {
    console.error("List collections error:", err);
    res.status(500).json({ error: "InternalServerError", message: "Something went wrong" });
  }
});

// GET /api/collections/:id — Get specific collection
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    if (!ObjectId.isValid(req.params.id as string)) {
      res.status(400).json({ error: "BadRequest", message: "Invalid collection ID format" });
      return;
    }

    const db = mongoclient.db("agenthooks");
    const collection = db.collection("endpoint_collections");

    const col = await collection.findOne({
      _id: new ObjectId(req.params.id as string),
      userId: req.user,
    });

    if (!col) {
      res.status(404).json({ error: "NotFound", message: "Collection not found" });
      return;
    }

    res.json({
      ...col,
      _id: col._id.toString(),
      endpointIds: Array.isArray(col.endpointIds)
        ? col.endpointIds.map((id: any) => id.toString())
        : [],
    });
  } catch (err) {
    console.error("Get collection error:", err);
    res.status(500).json({ error: "InternalServerError", message: "Something went wrong" });
  }
});

// PUT /api/collections/:id — Update collection
router.put("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    if (!ObjectId.isValid(req.params.id as string)) {
      res.status(400).json({ error: "BadRequest", message: "Invalid collection ID format" });
      return;
    }

    const { name, description, endpointIds } = req.body;

    if (name !== undefined && (typeof name !== "string" || !name.trim())) {
      res.status(400).json({ error: "BadRequest", message: "name cannot be empty" });
      return;
    }

    const db = mongoclient.db("agenthooks");
    const collection = db.collection("endpoint_collections");

    const collectionId = new ObjectId(req.params.id as string);
    const existingDoc = await collection.findOne({
      _id: collectionId,
      userId: req.user,
    });

    if (!existingDoc) {
      res.status(404).json({ error: "NotFound", message: "Collection not found" });
      return;
    }

    const updateFields: any = {
      updatedAt: new Date(),
    };

    if (name !== undefined) {
      updateFields.name = name.trim();
    }
    if (description !== undefined) {
      updateFields.description = description;
    }
    if (endpointIds !== undefined) {
      if (Array.isArray(endpointIds)) {
        updateFields.endpointIds = endpointIds
          .filter((id) => typeof id === "string" && ObjectId.isValid(id))
          .map((id) => new ObjectId(id));
      } else {
        updateFields.endpointIds = [];
      }
    }

    await collection.updateOne(
      { _id: collectionId, userId: req.user },
      { $set: updateFields }
    );

    const updatedDoc = await collection.findOne({ _id: collectionId });

    res.json({
      ...updatedDoc,
      _id: updatedDoc!._id.toString(),
      endpointIds: Array.isArray(updatedDoc!.endpointIds)
        ? updatedDoc!.endpointIds.map((id: any) => id.toString())
        : [],
    });
  } catch (err) {
    console.error("Update collection error:", err);
    res.status(500).json({ error: "InternalServerError", message: "Something went wrong" });
  }
});

// DELETE /api/collections/:id — Delete collection
router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    if (!ObjectId.isValid(req.params.id as string)) {
      res.status(400).json({ error: "BadRequest", message: "Invalid collection ID format" });
      return;
    }

    const db = mongoclient.db("agenthooks");
    const collection = db.collection("endpoint_collections");

    const result = await collection.deleteOne({
      _id: new ObjectId(req.params.id as string),
      userId: req.user,
    });

    if (result.deletedCount === 0) {
      res.status(404).json({ error: "NotFound", message: "Collection not found" });
      return;
    }

    res.json({ message: "Collection deleted" });
  } catch (err) {
    console.error("Delete collection error:", err);
    res.status(500).json({ error: "InternalServerError", message: "Something went wrong" });
  }
});

export default router;
