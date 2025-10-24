import express from "express";
import { PrismaClient } from "@prisma/client";
import { assert } from "superstruct";
import {
  CreateUser,
  PatchUser,
  CreateProduct,
  PatchProduct,
  CreateOrder,
} from "./structs.js";

const app = express();
const port = process.env.PORT || 3000;
app.use(express.json());

const prisma = new PrismaClient();

//#region users routes
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
    include: {
      //저장에는 무관/ 보기 위한 코드
      userPreference: true,
    },
  });
  console.log(users);
  res.send(users);
});

app.get("/users/:id", async (req, res) => {
  const id = req.params.id;
  const user = await prisma.user.findUnique({
    include: { userPreference: true },
    where: { id },
  });
  user.userPreference;
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
  // const data = req.body;
  try {
    assert(req.body, PatchUser);
    const { userPreference, ...userFields } = req.body;
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...userFields,
        userPreference: {
          update: userPreference,
        },
      },
      include: {
        userPreference: true,
      },
    });
    res.send(user);
  } catch (e) {
    return res.status(400).send({ error: "Check request body" });
  }
});

app.delete("/users/:id", async (req, res) => {
  const { id } = req.params;
  const user = await prisma.user.delete({
    where: { id },
  });
  res.status(user);
});
//#endregion

//#region Oproduct routes

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

//#endregion

//#region Orders

app.get("/orders", async (req, res) => {
  try {
    const data = await prisma.order.findMany();
    res.send(data);
  } catch (e) {
    res.sendStatus(e.status).send("dwadwa");
  }
});

app.post("/orders", async (req, res) => {
  try {
    assert(req.body, CreateOrder);
    const { orderItems, ...orderProperties } = req.body;
    const productIds = orderItems.map((orderItem) => orderItem.productId);
    function getQuantity(productId) {
      const orderItem = orderItems.find(
        (orderItem) => orderItem.productId === productId
      );
      return orderItem;
    }

    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });
    const isSufficientStock = products.every((product) => {
      const { id, stock } = product;
      return stock >= getQuantity(id);
    });

    if (!isSufficientStock) {
      return res.status(500).send({ message: "Insufficient Stock" });
    }

    const order = await prisma.order.create({
      data: {
        ...orderProperties,
        orderItems: {
          create: orderItems,
        },
        include: {
          orderItems: true,
        },
      },
    });

    res.status(201).send(order);
  } catch (e) {
    console.log(e);
  }
});

//#endregion

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
