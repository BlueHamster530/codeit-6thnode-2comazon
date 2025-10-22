import express from "express";
import { PrismaClient } from "@prisma/client";

const app = express();
const port = process.env.PORT || 3000;
app.use(express.json());

const prisma = new PrismaClient();

//users routes
app.get("/users", async (req, res) => {
  const users = await prisma.user.findMany();
  console.log(users);
  res.send(users);
});

app.post("/users", async (req, res) => {
  const data = req.body;
  const user = await prisma.user.create({
    data,
  });
  res.status(201).send(user);
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
