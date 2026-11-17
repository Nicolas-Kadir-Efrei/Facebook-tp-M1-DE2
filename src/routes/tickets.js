const express = require('express');
const prisma = require('../prisma');
const { asyncHandler, httpError } = require('../middleware/errorHandler');

const router = express.Router();

const ticketTypeInclude = {
  purchases: true,
  event: true,
};

router.get(
  '/types',
  asyncHandler(async (req, res) => {
    const where = {};
    if (req.query.eventId) where.eventId = req.query.eventId;
    const types = await prisma.ticketType.findMany({
      where,
      include: ticketTypeInclude,
      orderBy: { createdAt: 'desc' },
    });
    res.json(types);
  })
);

router.get(
  '/types/:id',
  asyncHandler(async (req, res) => {
    const type = await prisma.ticketType.findUnique({
      where: { id: req.params.id },
      include: ticketTypeInclude,
    });
    if (!type) throw httpError(404, 'Type de billet introuvable');
    res.json(type);
  })
);

router.post(
  '/types',
  asyncHandler(async (req, res) => {
    const { name, amount, quantityLimit, eventId, organizerId } = req.body;
    if (!name || amount === undefined || !quantityLimit || !eventId) {
      throw httpError(400, 'name, amount, quantityLimit et eventId sont obligatoires');
    }

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw httpError(404, 'Événement introuvable');
    if (event.visibility !== 'PUBLIC') {
      throw httpError(400, 'La billetterie est réservée aux événements publics');
    }
    if (!event.ticketingEnabled) {
      throw httpError(400, 'La billetterie n\'est pas activée pour cet événement');
    }

    if (organizerId) {
      const organizer = await prisma.eventOrganizer.findUnique({
        where: { eventId_userId: { eventId, userId: organizerId } },
      });
      if (!organizer) throw httpError(403, 'Seul un organisateur peut créer un type de billet');
    }

    const type = await prisma.ticketType.create({
      data: {
        name,
        amount: Number(amount),
        quantityLimit: Number(quantityLimit),
        eventId,
      },
      include: ticketTypeInclude,
    });
    res.status(201).json(type);
  })
);

router.put(
  '/types/:id',
  asyncHandler(async (req, res) => {
    const { name, amount, quantityLimit } = req.body;
    const type = await prisma.ticketType.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(amount !== undefined && { amount: Number(amount) }),
        ...(quantityLimit !== undefined && { quantityLimit: Number(quantityLimit) }),
      },
      include: ticketTypeInclude,
    });
    res.json(type);
  })
);

router.delete(
  '/types/:id',
  asyncHandler(async (req, res) => {
    await prisma.ticketType.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

router.get(
  '/purchases',
  asyncHandler(async (req, res) => {
    const where = {};
    if (req.query.ticketTypeId) where.ticketTypeId = req.query.ticketTypeId;
    if (req.query.email) where.email = req.query.email;
    const purchases = await prisma.ticketPurchase.findMany({
      where,
      include: { ticketType: { include: { event: true } } },
      orderBy: { purchaseDate: 'desc' },
    });
    res.json(purchases);
  })
);

router.post(
  '/purchases',
  asyncHandler(async (req, res) => {
    const { ticketTypeId, firstName, lastName, address, email } = req.body;
    if (!ticketTypeId || !firstName || !lastName || !address || !email) {
      throw httpError(400, 'ticketTypeId, firstName, lastName, address et email sont obligatoires');
    }

    const type = await prisma.ticketType.findUnique({
      where: { id: ticketTypeId },
      include: { purchases: true, event: true },
    });
    if (!type) throw httpError(404, 'Type de billet introuvable');
    if (type.purchases.length >= type.quantityLimit) {
      throw httpError(409, 'Plus de billets disponibles pour ce type');
    }

    // Une personne extérieure ne peut obtenir qu'1 seul billet (par email pour cet événement)
    const existingForEvent = await prisma.ticketPurchase.findFirst({
      where: {
        email,
        ticketType: { eventId: type.eventId },
      },
    });
    if (existingForEvent) {
      throw httpError(409, 'Une personne ne peut obtenir qu\'un seul billet pour cet événement');
    }

    const purchase = await prisma.ticketPurchase.create({
      data: {
        ticketTypeId,
        firstName,
        lastName,
        address,
        email,
      },
      include: { ticketType: { include: { event: true } } },
    });
    res.status(201).json(purchase);
  })
);

router.delete(
  '/purchases/:id',
  asyncHandler(async (req, res) => {
    await prisma.ticketPurchase.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

module.exports = router;
