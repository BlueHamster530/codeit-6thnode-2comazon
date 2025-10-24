import * as s from "superstruct";
import isEmail from "is-email";
import isUuid from "is-uuid";

const Category = [
  "FASHION",
  "BEAUTY",
  "SPORTS",
  "ELECTRONICS",
  "HOME_INTERIOR",
  "KITCHENWARE",
  "HOUSEHOLD_SUPPLIES",
];
const Order_Status = ["PENDING", "COMPLETE"];

export const CreateUser = s.object({
  email: s.define("Email", isEmail),
  firstName: s.size(s.string(), 1, 30),
  lastName: s.size(s.string(), 1, 30),
  address: s.string(),
  userPreference: s.object({
    receiveEmail: s.boolean(),
  }),
});

export const PatchUser = s.partial(CreateUser);


export const CreateProduct = s.object({
  name: s.size(s.string(), 1, 100),
  description: s.string(),
  category: s.enums(Category),
  price: s.min(s.number(), 0),
  stock: s.min(s.integer(), 0),
});

export const PatchProduct = s.partial(CreateProduct);

export const CreateOrder = s.object({
  userId: s.define("Uuid", (value) => isUuid.v4(value)),
  orderItems: s.array(
    s.object({
      productId: s.define("Uuid", (value) => isUuid.v4(value)),
      unitPrice: s.min(s.number(), 0),
      quantity: s.min(s.integer(), 1),
    })
  ),
  // status: s.enums(OrderStatus),
});


export const PatchOrder = s.object({
  status: s.enums(Order_Status),
});

export const SaveProduct = s.object({
  productId: s.define("Uuid", (value) => isUuid.v4(value)),

});