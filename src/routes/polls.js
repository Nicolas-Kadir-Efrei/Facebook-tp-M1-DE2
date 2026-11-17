const express = require('express');
const prisma = require('../prisma');
const { asyncHandler, httpError } = require('../middleware/errorHandler');
const { pollInclude } = require('../utils/includes');

const router = express.Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const where = {};
    if (req.query.eventId) where.eventId = req.query.eventId;
    const polls = await prisma.poll.findMany({
      where,
      include: pollInclude,
      orderBy: { createdAt: 'desc' },
    });
    res.json(polls);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const poll = await prisma.poll.findUnique({
      where: { id: req.params.id },
      include: pollInclude,
    });
    if (!poll) throw httpError(404, 'Sondage introuvable');
    res.json(poll);
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { title, eventId, creatorId, questions = [] } = req.body;
    if (!title || !eventId || !creatorId) {
      throw httpError(400, 'title, eventId et creatorId sont obligatoires');
    }

    const organizer = await prisma.eventOrganizer.findUnique({
      where: { eventId_userId: { eventId, userId: creatorId } },
    });
    if (!organizer) throw httpError(403, 'Seul un organisateur peut créer un sondage');

    if (!questions.length) throw httpError(400, 'Au moins une question est requise');
    for (const q of questions) {
      if (!q.text || !q.options || q.options.length < 2) {
        throw httpError(400, 'Chaque question doit avoir un texte et au moins 2 options');
      }
    }

    const poll = await prisma.poll.create({
      data: {
        title,
        eventId,
        creatorId,
        questions: {
          create: questions.map((q) => ({
            text: q.text,
            options: {
              create: q.options.map((opt) => ({
                text: typeof opt === 'string' ? opt : opt.text,
              })),
            },
          })),
        },
      },
      include: pollInclude,
    });
    res.status(201).json(poll);
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { title } = req.body;
    const poll = await prisma.poll.update({
      where: { id: req.params.id },
      data: { ...(title !== undefined && { title }) },
      include: pollInclude,
    });
    res.json(poll);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await prisma.poll.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

router.post(
  '/:id/respond',
  asyncHandler(async (req, res) => {
    const { userId, answers } = req.body;
    if (!userId || !Array.isArray(answers) || !answers.length) {
      throw httpError(400, 'userId et answers[] sont obligatoires');
    }

    const poll = await prisma.poll.findUnique({
      where: { id: req.params.id },
      include: { questions: { include: { options: true } } },
    });
    if (!poll) throw httpError(404, 'Sondage introuvable');

    const participant = await prisma.eventParticipant.findUnique({
      where: { eventId_userId: { eventId: poll.eventId, userId } },
    });
    const organizer = await prisma.eventOrganizer.findUnique({
      where: { eventId_userId: { eventId: poll.eventId, userId } },
    });
    if (!participant && !organizer) {
      throw httpError(403, 'Seul un participant peut répondre au sondage');
    }

    const questionMap = new Map(poll.questions.map((q) => [q.id, q]));

    for (const answer of answers) {
      const question = questionMap.get(answer.questionId);
      if (!question) throw httpError(400, `Question invalide: ${answer.questionId}`);
      const option = question.options.find((o) => o.id === answer.optionId);
      if (!option) throw httpError(400, `Option invalide pour la question ${answer.questionId}`);

      await prisma.pollResponse.upsert({
        where: {
          questionId_userId: { questionId: answer.questionId, userId },
        },
        create: {
          questionId: answer.questionId,
          optionId: answer.optionId,
          userId,
        },
        update: { optionId: answer.optionId },
      });
    }

    const updated = await prisma.poll.findUnique({
      where: { id: req.params.id },
      include: pollInclude,
    });
    res.json(updated);
  })
);

module.exports = router;
