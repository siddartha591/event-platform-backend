const Event = require('../models/Event');
const cloudinary = require('../config/cloudinary');
const axios = require('axios');

// Create Event
exports.createEvent = async (req, res) => {
  try {
    const { title, description, date, time, location, capacity, image } = req.body;

    // Upload image to Cloudinary
    let imageUrl = '';
    if (image) {
      const result = await cloudinary.uploader.upload(image, {
        folder: 'events',
        resource_type: 'auto'
      });
      imageUrl = result.secure_url;
    }

    const event = new Event({
      title,
      description,
      date,
      time,
      location,
      capacity,
      imageUrl,
      creator: req.userId
    });

    await event.save();
    res.status(201).json({ success: true, event });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Generate AI Description
// Generate AI Description
exports.generateDescription = async (req, res) => {
  try {
    console.log('🤖 AI Description Request:', req.body);
    
    const { title, location, date } = req.body;

    if (!title || !location || !date) {
      return res.status(400).json({ 
        message: 'Title, location, and date are required' 
      });
    }

    // Check if Groq API key exists
    if (!process.env.GROQ_API_KEY) {
      console.error('❌ GROQ_API_KEY not found in environment variables');
      return res.status(500).json({ 
        message: 'AI service not configured. GROQ_API_KEY is missing.',
        error: 'GROQ_API_KEY not set'
      });
    }

    const prompt = `Generate an engaging event description for:
Title: ${title}
Location: ${location}
Date: ${new Date(date).toLocaleDateString('en-US', { 
  weekday: 'long', 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
})}

Create a compelling 2-3 sentence description that highlights what attendees can expect and why they should attend. Make it exciting and professional.`;

    console.log('🚀 Sending request to Groq API...');

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',  // ✅ UPDATED MODEL
        messages: [
          {
            role: 'system',
            content: 'You are a professional event marketing expert who creates engaging event descriptions.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 200
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const description = response.data.choices[0].message.content.trim();
    console.log('✅ AI Description generated successfully');

    res.json({ 
      success: true, 
      description 
    });

  } catch (error) {
    console.error('❌ AI Generation Error:');
    console.error('Error message:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      
      if (error.response.status === 401) {
        return res.status(500).json({ 
          message: 'Invalid Groq API key',
          error: 'Authentication failed'
        });
      } else if (error.response.status === 429) {
        return res.status(500).json({ 
          message: 'Rate limit exceeded. Please try again in a moment.',
          error: 'Too many requests'
        });
      } else if (error.response.status === 400) {
        return res.status(500).json({ 
          message: 'Bad request to AI service',
          error: error.response.data?.error?.message || 'Invalid request'
        });
      }
    }
    
    res.status(500).json({ 
      message: 'Failed to generate description with AI',
      error: error.message,
      tip: 'You can write the description manually'
    });
  }
};


// Get All Events
exports.getAllEvents = async (req, res) => {
  try {
    const events = await Event.find()
      .populate('creator', 'name email')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, events });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get Single Event
exports.getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('creator', 'name email')
      .populate('attendees', 'name email');
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    res.json({ success: true, event });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update Event
exports.updateEvent = async (req, res) => {
  try {
    const { title, description, date, time, location, capacity, image } = req.body;
    
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Check if user is the creator
    if (event.creator.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to update this event' });
    }
    
    // Update image if provided
    let imageUrl = event.imageUrl;
    if (image && image !== event.imageUrl) {
      const result = await cloudinary.uploader.upload(image, {
        folder: 'events',
        resource_type: 'auto'
      });
      imageUrl = result.secure_url;
    }
    
    event.title = title;
    event.description = description;
    event.date = date;
    event.time = time;
    event.location = location;
    event.capacity = capacity;
    event.imageUrl = imageUrl;
    
    await event.save();
    res.json({ success: true, event });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete Event
exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    if (event.creator.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to delete this event' });
    }
    
    await Event.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// RSVP to Event
exports.rsvpEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Check if user already RSVP'd
    if (event.attendees.includes(req.userId)) {
      return res.status(400).json({ message: 'You have already RSVP\'d to this event' });
    }
    
    // Check capacity
    if (event.attendees.length >= event.capacity) {
      return res.status(400).json({ message: 'Event is full' });
    }
    
    event.attendees.push(req.userId);
    await event.save();
    
    res.json({ success: true, message: 'RSVP successful', event });
  } catch (error) {
    console.error('RSVP error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Cancel RSVP
exports.cancelRSVP = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    event.attendees = event.attendees.filter(
      attendee => attendee.toString() !== req.userId
    );
    
    await event.save();
    res.json({ success: true, message: 'RSVP cancelled', event });
  } catch (error) {
    console.error('Cancel RSVP error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get User's Created Events
exports.getUserEvents = async (req, res) => {
  try {
    const events = await Event.find({ creator: req.userId })
      .populate('attendees', 'name email')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, events });
  } catch (error) {
    console.error('Get user events error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
