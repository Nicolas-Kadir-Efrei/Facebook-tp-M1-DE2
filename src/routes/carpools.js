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
    const carpools = await prisma.carpool.findMany({
      where,
      include,
      orderBy: { departureTime: 'asc' },
    });
    res.json(carpools);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const carpool = await prisma.carpool.findUnique({
      where: { id: req.params.id },
      include,
    });
    if (!carpool) throw httpError(404, 'Covoiturage introuvable');
    res.json(carpool);
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const {
      departureLocation,
      departureTime,
      price,
      availableSeats,
      maxTimeDeviationMinutes,
      eventId,
      userId,
    } = req.body;

    if (
      !departureLocation ||
      !departureTime ||
      price === undefined ||
      !availableSeats ||
      maxTimeDeviationMinutes === undefined ||
      !eventId ||
      !userId
    ) {
      throw httpError(
        400,
        'departureLocation, departureTime, price, availableSeats, maxTimeDeviationMinutes, eventId et userId sont obligatoires'
      );
    }

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw httpError(404, 'Événement introuvable');
    if (!event.carpoolingEnabled) {
      throw httpError(400, 'Le covoiturage n\'est pas activé pour cet événement');
    }

    const carpool = await prisma.carpool.create({
      data: {
        departureLocation,
        departureTime: new Date(departureTime),
        price: Number(price),
        availableSeats: Number(availableSeats),
        maxTimeDeviationMinutes: Number(maxTimeDeviationMinutes),
        eventId,
        userId,
      },
      include,
    });
    res.status(201).json(carpool);
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const {
      departureLocation,
      departureTime,
      price,
      availableSeats,
      maxTimeDeviationMinutes,
    } = req.body;

    const carpool = await prisma.carpool.update({
      where: { id: req.params.id },
      data: {
        ...(departureLocation !== undefined && { departureLocation }),
        ...(departureTime !== undefined && { departureTime: new Date(departureTime) }),
        ...(price !== undefined && { price: Number(price) }),
        ...(availableSeats !== undefined && { availableSeats: Number(availableSeats) }),
        ...(maxTimeDeviationMinutes !== undefined && {
          maxTimeDeviationMinutes: Number(maxTimeDeviationMinutes),
        }),
      },
      include,
    });
    res.json(carpool);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await prisma.carpool.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

module.exports = router;
