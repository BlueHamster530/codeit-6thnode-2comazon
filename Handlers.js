import { Prisma } from "@prisma/client";

export function asyncHandler(handler) {
  return async function (req, res) {
    try {
      await handler(req, res);
    } catch (e) {
      console.error(e);
      console.error(e.name);
      if (
        e instanceof Prisma.PrismaClientKnownRequestError && e.code == "P2025"
      ) {
        res.sendStatus(404);
      } else if (
        e instanceof Prisma.PrismaClientKnownRequestError && e.code == "P2002"
      ) {
        res.status(400).send({ message: e.message });
      } else if (e.name == "StructError") {
        res.status(400).send({ message: e.message });
      } else {
        res.status(500).send({ message: e.message });
      }
    }
  };
}
