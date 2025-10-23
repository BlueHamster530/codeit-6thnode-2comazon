import express from "express";
import { PrismaClient } from "@prisma/client";
import { assert } from "superstruct";
import {
  CreateUser,
  PatchUser,
  CreateProduct,
  PatchProduct,
} from "./structs.js";

const app = express();
const port = process.env.PORT || 3000;
app.use(express.json());

const prisma = new PrismaClient();

//users routes
app.get("/users", async (req, res) => {
  const { offset = 0, limit = 0, order = "newest" } = req.query;
  let orderBy;
  switch (order) {
    case "oldest":
      orderBy = { createdAt: "asc" };
      break;
    case "newest":
      orderBy = { createdAt: "desc" };
      break;
    default:
      orderBy = { createdAt: "desc" };
  }
  const users = await prisma.user.findMany({
    orderBy,
    skip: parseInt(offset),
    take: parseInt(limit) || undefined,
  });
  console.log(users);
  res.send(users);
});

app.get("/users/:id", async (req, res) => {
  const id = req.params.id;
  const user = await prisma.user.findUnique({
    where: { id },
  });
  if (user) res.send(user);
  else res.status(404).send({ error: "User not found" });
});

app.post("/users", async (req, res) => {
  const data = req.body;
  try {
    assert(data, CreateUser);
    const { userPreference, ...userFields } = req.body;

    const user = await prisma.user.create({
      data: {
        ...userFields,
        userPreference: {
          create: userPreference,
        },
      },
      include: {
        //저장에는 무관/ 보기 위한 코드
        userPreference: true,
      },
    });
    res.status(201).send(user);
  } catch (e) {
    console.error(e);
    console.log("Validation failed");
    return res.status(400).send({ error: "Check request body" });
  }
});

app.patch("/users/:id", async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  try {
    assert(data, PatchUser);
  } catch (e) {
    return res.status(400).send({ error: "Check request body" });
  }
  const user = await prisma.user.update({
    where: { id },
    data,
  });
  res.send(user);
});

app.delete("/users/:id", async (req, res) => {
  const { id } = req.params;
  const user = await prisma.user.delete({
    where: { id },
  });
  res.status(user);
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

//product routes

app.get("/products", async (req, res) => {
  const { offset = 0, limit = 0, order = "newest", category } = req.query;
  let orderBy;
  switch (order) {
    case "oldest":
      orderBy = { createdAt: "asc" };
      break;
    case "newest":
      orderBy = { createdAt: "desc" };
      break;
    case "priceLowest":
      orderBy = { price: "asc" };
      break;
    case "priceHighest":
      orderBy = { price: "desc" };
      break;
    default:
      orderBy = { createdAt: "desc" };
  }
  const where = category ? { category } : {};
  const product = await prisma.product.findMany({
    where,
    orderBy,
    skip: parseInt(offset),
    take: parseInt(limit) || undefined,
  });
  console.log(product);
  res.send(product);
});

app.get("/products/:id", async (req, res) => {
  const { id } = req.params;
  const product = await prisma.product.findUnique({
    where: { id },
  });
  res.send(product);
});

app.post("/products", async (req, res) => {
  const data = req.body;
  try {
    assert(data, CreateProduct);
  } catch (e) {
    return res.status(400).send({ error: "Check request body" });
  }
  const product = await prisma.product.create({
    data,
  });
  res.status(201).send(product);
});

app.patch("/products/:id", async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  try {
    assert(data, PatchProduct);
  } catch (e) {
    return res.status(400).send({ error: "Check request body" });
  }
  const product = await prisma.product.update({
    where: { id },
    data,
  });
  res.send(product);
});

app.delete("/products/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const product = await prisma.product.delete({
      where: { id },
    });

    res.status(product);
  } catch (error) {
    console.error("없는 상품입니다.");
    res
      .status(400)
      .send({ error: "Cannot delete product that is associated with orders." });
  }
});
