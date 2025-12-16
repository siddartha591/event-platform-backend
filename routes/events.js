const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const authMiddleware = require('../middleware/auth');

// AI Description Generation (Protected)
router.post('/generate-description', authMiddleware, eventController.generateDescription);

// Event CRUD
router.post('/', authMiddleware, eventController.createEvent);
router.get('/', authMiddleware, eventController.getAllEvents);
router.get('/my-events', authMiddleware, eventController.getUserEvents);
router.get('/:id', authMiddleware, eventController.getEventById);
router.put('/:id', authMiddleware, eventController.updateEvent);
router.delete('/:id', authMiddleware, eventController.deleteEvent);

// RSVP
router.post('/:id/rsvp', authMiddleware, eventController.rsvpEvent);
router.delete('/:id/rsvp', authMiddleware, eventController.cancelRSVP);

module.exports = router;
