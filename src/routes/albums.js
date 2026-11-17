const express = require('express');
const prisma = require('../prisma');
const { asyncHandler, httpError } = require('../middleware/errorHandler');
const { albumInclude, userPublic } = require('../utils/includes');

const router = express.Router();

async function assertEventParticipant(eventId, userId) {
  const participant = await prisma.eventParticipant.findUnique({
    where: { eventId_userId: { eventId, userId } },
  });
  const organizer = await prisma.eventOrganizer.findUnique({
    where: { eventId_userId: { eventId, userId } },
  });
  if (!participant && !organizer) {
    throw httpError(403, 'Seul un participant de l\'événement peut intervenir');
  }
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const where = {};
    if (req.query.eventId) where.eventId = req.query.eventId;
    const albums = await prisma.photoAlbum.findMany({
      where,
      include: albumInclude,
      orderBy: { createdAt: 'desc' },
    });
    res.json(albums);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const album = await prisma.photoAlbum.findUnique({
      where: { id: req.params.id },
      include: albumInclude,
    });
    if (!album) throw httpError(404, 'Album introuvable');
    res.json(album);
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { name, description, eventId } = req.body;
    if (!name || !eventId) throw httpError(400, 'name et eventId sont obligatoires');
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw httpError(404, 'Événement introuvable');

    const album = await prisma.photoAlbum.create({
      data: { name, description, eventId },
      include: albumInclude,
    });
    res.status(201).json(album);
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { name, description } = req.body;
    const album = await prisma.photoAlbum.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
      },
      include: albumInclude,
    });
    res.json(album);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await prisma.photoAlbum.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

router.post(
  '/:id/photos',
  asyncHandler(async (req, res) => {
    const { url, caption, authorId } = req.body;
    if (!url || !authorId) throw httpError(400, 'url et authorId sont obligatoires');

    const album = await prisma.photoAlbum.findUnique({ where: { id: req.params.id } });
    if (!album) throw httpError(404, 'Album introuvable');
    await assertEventParticipant(album.eventId, authorId);

    const photo = await prisma.photo.create({
      data: { url, caption, authorId, albumId: req.params.id },
      include: {
        author: { select: userPublic },
        comments: true,
      },
    });
    res.status(201).json(photo);
  })
);

router.put(
  '/photos/:photoId',
  asyncHandler(async (req, res) => {
    const { url, caption } = req.body;
    const photo = await prisma.photo.update({
      where: { id: req.params.photoId },
      data: {
        ...(url !== undefined && { url }),
        ...(caption !== undefined && { caption }),
      },
      include: { author: { select: userPublic }, comments: true },
    });
    res.json(photo);
  })
);

router.delete(
  '/photos/:photoId',
  asyncHandler(async (req, res) => {
    await prisma.photo.delete({ where: { id: req.params.photoId } });
    res.status(204).send();
  })
);

router.post(
  '/photos/:photoId/comments',
  asyncHandler(async (req, res) => {
    const { content, authorId } = req.body;
    if (!content || !authorId) throw httpError(400, 'content et authorId sont obligatoires');

    const photo = await prisma.photo.findUnique({
      where: { id: req.params.photoId },
      include: { album: true },
    });
    if (!photo) throw httpError(404, 'Photo introuvable');
    await assertEventParticipant(photo.album.eventId, authorId);

    const comment = await prisma.photoComment.create({
      data: { content, authorId, photoId: req.params.photoId },
      include: { author: { select: userPublic } },
    });
    res.status(201).json(comment);
  })
);

router.delete(
  '/comments/:commentId',
  asyncHandler(async (req, res) => {
    await prisma.photoComment.delete({ where: { id: req.params.commentId } });
    res.status(204).send();
  })
);

module.exports = router;
