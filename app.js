import express from 'express';
import { Prisma, PrismaClient } from '@prisma/client';
import { assert } from 'superstruct';
import { asyncHandler } from './Handlers.js';
import { CreateUser, PatchUser, CreateProduct, PatchProduct, CreateOrder, PatchOrder } from './structs.js';

const app = express();
const port = process.env.PORT || 3000;
app.use(express.json());

const prisma = new PrismaClient();

//#region users routes
app.get('/users', asyncHandler(async (req, res) => {
  const { offset = 0, limit = 0, order = 'newest' } = req.query;
  let orderBy;
  switch (order) {
    case 'oldest':
      orderBy = { createdAt: 'asc' };
      break;
    case 'newest':
      orderBy = { createdAt: 'desc' };
      break;
    default:
      orderBy = { createdAt: 'desc' };
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
}));

app.get('/users/:id', asyncHandler(async (req, res) => {
  const id = req.params.id;
  const user = await prisma.user.findUniqueOrThrow({
    where: { id },
    include: { userPreference: true },
  });
  res.send(user);
}),
);

app.post('/users', asyncHandler(async (req, res) => {
  assert(req.body, CreateUser);
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
}),
);

app.patch('/users/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
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
}),
);

app.delete('/users/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await prisma.user.delete({
    where: { id },
  });
  res.status(user);
}));
//#endregion

//#region Oproduct routes

app.get('/products', asyncHandler(async (req, res) => {
  const { offset = 0, limit = 0, order = 'newest', category } = req.query;
  let orderBy;
  switch (order) {
    case 'oldest':
      orderBy = { createdAt: 'asc' };
      break;
    case 'newest':
      orderBy = { createdAt: 'desc' };
      break;
    case 'priceLowest':
      orderBy = { price: 'asc' };
      break;
    case 'priceHighest':
      orderBy = { price: 'desc' };
      break;
    default:
      orderBy = { createdAt: 'desc' };
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
}));

app.get('/products/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const product = await prisma.product.findUniqueOrThrow({
    where: { id },
  });
  res.send(product);
}));

app.post('/products', asyncHandler(async (req, res) => {
  const data = req.body;
  assert(data, CreateProduct);
  const product = await prisma.product.create({
    data,
  });
  res.status(201).send(product);
}));

app.patch('/products/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  assert(data, PatchProduct);
  const product = await prisma.product.update({
    where: { id },
    data,
  });
  res.send(product);
}));

app.delete('/products/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const product = await prisma.product.delete({
    where: { id },
  });
  res.status(204).send(product);
}));

//#endregion

//#region Orders

app.get('/orders', asyncHandler(async (req, res) => {
  const data = await prisma.order.findMany();
  res.send(data);
}));

app.get('/orders/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const order = await prisma.order.findUniqueOrThrow({
    where: { id },
    include: {
      OrderItems: {
        include: {
          product: true,
        }
      }
    },
  });
  let total = 0;
  order.OrderItems.forEach((orderItem) => {
    total += orderItem.unitPrice * orderItem.quantity;
  });
  order.total = total;
  console.log(`구매 총액은 ${order.total} 입니다.`);
  res.send(order);
}));

app.post('/orders', asyncHandler(async (req, res) => {
  assert(req.body, CreateOrder);
  const { orderItems, ...orderProperties } = req.body;
  const productIds = orderItems.map((orderItem) => orderItem.productId);
  function getQuantity(productId) {
    const orderItem = orderItems.find((orderItem) => orderItem.productId === productId);
    return orderItem.quantity;
  }

  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
  });
  const isSufficientStock = products.every((product) => {
    const { id, stock } = product;
    return stock >= getQuantity(id);
  });

  if (!isSufficientStock) {
    return res.status(500).send({ message: 'Insufficient Stock' });
  }

  const queries = productIds.map((id) => {
    return prisma.product.update({
      where: { id },
      data: {
        stock: { decrement: getQuantity(id) },
      },
    });
  });

  //재고 업데이트
  const [order] = await prisma.$transaction([
    prisma.order.create({
      data: {
        user: {
          connect: { id: orderProperties.userId },
        },
        OrderItems: {
          create: orderItems,
        },
      },
      include: {
        OrderItems: true,
      },
    }),
    ...queries,
  ]);
  //주문 생성
  res.status(201).send(order);
}));

app.patch('/orders/:id', asyncHandler(async (req, res) => {
  assert(req.body, PatchOrder);
  const { id } = req.params;
  const { status } = req.body;
  const data = await prisma.order.update({
    where: { id },
    data: { status }
  });
  res.send(data);
}));

app.delete('/orders/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  await prisma.order.delete({ where: { id } });
  res.sendStatus(204);
}));


//#endregion

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
