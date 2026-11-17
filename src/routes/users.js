const express = require('express');
const prisma = require('../prisma');
const { asyncHandler, httpError } = require('../middleware/errorHandler');
const { userPublic } = require('../utils/includes');

const router = express.Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const users = await prisma.user.findMany({ select: userPublic, orderBy: { createdAt: 'desc' } });
    res.json(users);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.params.id }, select: userPublic });
    if (!user) throw httpError(404, 'Utilisateur introuvable');
    res.json(user);
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { email, firstName, lastName, password, bio, avatar } = req.body;
    if (!email || !firstName || !lastName) {
      throw httpError(400, 'email, firstName et lastName sont obligatoires');
    }
    const user = await prisma.user.create({
      data: { email, firstName, lastName, password, bio, avatar },
      select: userPublic,
    });
    res.status(201).json(user);
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { email, firstName, lastName, password, bio, avatar } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        ...(email !== undefined && { email }),
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(password !== undefined && { password }),
        ...(bio !== undefined && { bio }),
        ...(avatar !== undefined && { avatar }),
      },
      select: userPublic,
    });
    res.json(user);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

module.exports = router;
