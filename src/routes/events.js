const express = require('express');
const prisma = require('../prisma');
const { asyncHandler, httpError } = require('../middleware/errorHandler');
const { eventInclude } = require('../utils/includes');

const router = express.Router();

function mapEvent(event) {
  if (!event) return event;
  return {
    ...event,
    organizers: event.organizers?.map((o) => o.user) || [],
    participants: event.participants?.map((p) => p.user) || [],
  };
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const events = await prisma.event.findMany({
      include: eventInclude,
      orderBy: { startDate: 'asc' },
    });
    res.json(events.map(mapEvent));
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: eventInclude,
    });
    if (!event) throw httpError(404, 'Événement introuvable');
    res.json(mapEvent(event));
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const {
      name,
      description,
      startDate,
      endDate,
      location,
      coverPhoto,
      visibility,
      shoppingListEnabled,
      carpoolingEnabled,
      ticketingEnabled,
      groupId,
      organizerIds = [],
      participantIds = [],
      inviteAllGroupMembers,
    } = req.body;

    if (!name || !startDate || !endDate) {
      throw httpError(400, 'name, startDate et endDate sont obligatoires');
    }
    if (!organizerIds.length) {
      throw httpError(400, 'Au moins un organisateur (organizerIds) est requis');
    }

    let finalParticipants = [...new Set(participantIds)];

    if (groupId && inviteAllGroupMembers) {
      const members = await prisma.groupMember.findMany({ where: { groupId } });
      finalParticipants = [...new Set([...finalParticipants, ...members.map((m) => m.userId)])];
    }

    if (groupId) {
      const group = await prisma.group.findUnique({ where: { id: groupId } });
      if (!group) throw httpError(404, 'Groupe introuvable');
    }

    const event = await prisma.event.create({
      data: {
        name,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        location,
        coverPhoto,
        visibility: visibility || 'PUBLIC',
        shoppingListEnabled: !!shoppingListEnabled,
        carpoolingEnabled: !!carpoolingEnabled,
        ticketingEnabled: !!ticketingEnabled,
        groupId: groupId || null,
        organizers: {
          create: organizerIds.map((userId) => ({ userId })),
        },
        participants: {
          create: finalParticipants.map((userId) => ({ userId })),
        },
      },
      include: eventInclude,
    });

    res.status(201).json(mapEvent(event));
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const {
      name,
      description,
      startDate,
      endDate,
      location,
      coverPhoto,
      visibility,
      shoppingListEnabled,
      carpoolingEnabled,
      ticketingEnabled,
      groupId,
      organizerIds,
      participantIds,
    } = req.body;

    const data = {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(startDate !== undefined && { startDate: new Date(startDate) }),
      ...(endDate !== undefined && { endDate: new Date(endDate) }),
      ...(location !== undefined && { location }),
      ...(coverPhoto !== undefined && { coverPhoto }),
      ...(visibility !== undefined && { visibility }),
      ...(shoppingListEnabled !== undefined && { shoppingListEnabled }),
      ...(carpoolingEnabled !== undefined && { carpoolingEnabled }),
      ...(ticketingEnabled !== undefined && { ticketingEnabled }),
      ...(groupId !== undefined && { groupId }),
    };

    if (organizerIds) {
      if (!organizerIds.length) throw httpError(400, 'Au moins un organisateur est requis');
      await prisma.eventOrganizer.deleteMany({ where: { eventId: req.params.id } });
      data.organizers = { create: organizerIds.map((userId) => ({ userId })) };
    }

    if (participantIds) {
      await prisma.eventParticipant.deleteMany({ where: { eventId: req.params.id } });
      data.participants = { create: participantIds.map((userId) => ({ userId })) };
    }

    const event = await prisma.event.update({
      where: { id: req.params.id },
      data,
      include: eventInclude,
    });
    res.json(mapEvent(event));
  })
);

router.post(
  '/:id/participants/:userId',
  asyncHandler(async (req, res) => {
    const event = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!event) throw httpError(404, 'Événement introuvable');

    const existing = await prisma.eventParticipant.findUnique({
      where: {
        eventId_userId: { eventId: req.params.id, userId: req.params.userId },
      },
    });
    if (!existing) {
      await prisma.eventParticipant.create({
        data: { eventId: req.params.id, userId: req.params.userId },
      });
    }

    const updated = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: eventInclude,
    });
    res.status(existing ? 200 : 201).json(mapEvent(updated));
  })
);

router.delete(
  '/:id/participants/:userId',
  asyncHandler(async (req, res) => {
    await prisma.eventParticipant.delete({
      where: {
        eventId_userId: { eventId: req.params.id, userId: req.params.userId },
      },
    });
    res.status(204).send();
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await prisma.event.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

module.exports = router;
