const express = require('express');
const prisma = require('../prisma');
const { asyncHandler, httpError } = require('../middleware/errorHandler');
const { threadInclude } = require('../utils/includes');

const router = express.Router();

async function assertMemberOrParticipant(thread, userId) {
  if (thread.groupId) {
    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: thread.groupId, userId } },
    });
    const admin = await prisma.groupAdmin.findUnique({
      where: { groupId_userId: { groupId: thread.groupId, userId } },
    });
    if (!member && !admin) throw httpError(403, 'Seul un membre/admin du groupe peut intervenir');
  }
  if (thread.eventId) {
    const participant = await prisma.eventParticipant.findUnique({
      where: { eventId_userId: { eventId: thread.eventId, userId } },
    });
    const organizer = await prisma.eventOrganizer.findUnique({
      where: { eventId_userId: { eventId: thread.eventId, userId } },
    });
    if (!participant && !organizer) {
      throw httpError(403, 'Seul un participant/organisateur peut intervenir');
    }
  }
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const where = {};
    if (req.query.groupId) where.groupId = req.query.groupId;
    if (req.query.eventId) where.eventId = req.query.eventId;
    const threads = await prisma.discussionThread.findMany({
      where,
      include: threadInclude,
      orderBy: { createdAt: 'desc' },
    });
    res.json(threads);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const thread = await prisma.discussionThread.findUnique({
      where: { id: req.params.id },
      include: threadInclude,
    });
    if (!thread) throw httpError(404, 'Fil de discussion introuvable');
    res.json(thread);
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { title, groupId, eventId } = req.body;
    if ((!groupId && !eventId) || (groupId && eventId)) {
      throw httpError(400, 'Un fil doit être lié à 1 groupe OU 1 événement (pas les deux)');
    }
    if (groupId) {
      const group = await prisma.group.findUnique({ where: { id: groupId } });
      if (!group) throw httpError(404, 'Groupe introuvable');
    }
    if (eventId) {
      const event = await prisma.event.findUnique({ where: { id: eventId } });
      if (!event) throw httpError(404, 'Événement introuvable');
    }
    const thread = await prisma.discussionThread.create({
      data: { title, groupId: groupId || null, eventId: eventId || null },
      include: threadInclude,
    });
    res.status(201).json(thread);
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { title } = req.body;
    const thread = await prisma.discussionThread.update({
      where: { id: req.params.id },
      data: { ...(title !== undefined && { title }) },
      include: threadInclude,
    });
    res.json(thread);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await prisma.discussionThread.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

router.post(
  '/:id/messages',
  asyncHandler(async (req, res) => {
    const { content, authorId } = req.body;
    if (!content || !authorId) throw httpError(400, 'content et authorId sont obligatoires');

    const thread = await prisma.discussionThread.findUnique({ where: { id: req.params.id } });
    if (!thread) throw httpError(404, 'Fil de discussion introuvable');
    await assertMemberOrParticipant(thread, authorId);

    const message = await prisma.message.create({
      data: { content, authorId, threadId: req.params.id },
      include: {
        author: true,
        comments: true,
      },
    });
    res.status(201).json(message);
  })
);

router.put(
  '/messages/:messageId',
  asyncHandler(async (req, res) => {
    const { content } = req.body;
    const message = await prisma.message.update({
      where: { id: req.params.messageId },
      data: { content },
      include: { author: true, comments: true },
    });
    res.json(message);
  })
);

router.delete(
  '/messages/:messageId',
  asyncHandler(async (req, res) => {
    await prisma.message.delete({ where: { id: req.params.messageId } });
    res.status(204).send();
  })
);

router.post(
  '/messages/:messageId/comments',
  asyncHandler(async (req, res) => {
    const { content, authorId } = req.body;
    if (!content || !authorId) throw httpError(400, 'content et authorId sont obligatoires');

    const message = await prisma.message.findUnique({
      where: { id: req.params.messageId },
      include: { thread: true },
    });
    if (!message) throw httpError(404, 'Message introuvable');
    await assertMemberOrParticipant(message.thread, authorId);

    const comment = await prisma.messageComment.create({
      data: { content, authorId, messageId: req.params.messageId },
      include: { author: true },
    });
    res.status(201).json(comment);
  })
);

router.delete(
  '/comments/:commentId',
  asyncHandler(async (req, res) => {
    await prisma.messageComment.delete({ where: { id: req.params.commentId } });
    res.status(204).send();
  })
);

module.exports = router;
