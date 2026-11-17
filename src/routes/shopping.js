const express = require('express');
const prisma = require('../prisma');
const { asyncHandler, httpError } = require('../middleware/errorHandler');
const { userPublic } = require('../utils/includes');

const router = express.Router();

const include = {
  user: { select: userPublic },
  event: true,
};

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const where = {};
    if (req.query.eventId) where.eventId = req.query.eventId;
    const items = await prisma.shoppingListItem.findMany({
      where,
      include,
      orderBy: { arrivalTime: 'asc' },
    });
    res.json(items);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const item = await prisma.shoppingListItem.findUnique({
      where: { id: req.params.id },
      include,
    });
    if (!item) throw httpError(404, 'Item shopping list introuvable');
    res.json(item);
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { name, quantity, arrivalTime, eventId, userId } = req.body;
    if (!name || !quantity || !arrivalTime || !eventId || !userId) {
      throw httpError(400, 'name, quantity, arrivalTime, eventId et userId sont obligatoires');
    }

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw httpError(404, 'Événement introuvable');
    if (!event.shoppingListEnabled) {
      throw httpError(400, 'La shopping list n\'est pas activée pour cet événement');
    }

    const item = await prisma.shoppingListItem.create({
      data: {
        name,
        quantity: Number(quantity),
        arrivalTime: new Date(arrivalTime),
        eventId,
        userId,
      },
      include,
    });
    res.status(201).json(item);
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { name, quantity, arrivalTime } = req.body;
    const item = await prisma.shoppingListItem.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(quantity !== undefined && { quantity: Number(quantity) }),
        ...(arrivalTime !== undefined && { arrivalTime: new Date(arrivalTime) }),
      },
      include,
    });
    res.json(item);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await prisma.shoppingListItem.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

module.exports = router;
