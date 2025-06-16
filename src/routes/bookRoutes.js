import express from 'express';
import cloudinary from '../lib/cloudinary.js'; 
import Book from '../models/Book.js';
import protectRoute from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/', protectRoute, async (req, res) => {
  const { title, caption, image, rating } = req.body;
    
  try {
    if (!title || !caption || !image || !rating) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const uploadResponse = await cloudinary.uploader(image);
    const imageUrl = uploadResponse.secure_url;
    if (!imageUrl) {
      return res.status(500).json({ message: 'Image upload failed' });
    }
    const newBook = new Book({
      title,
      caption,
      image: imageUrl,
      rating,
      user: req.user._id, 
    });

    const savedBook = await newBook.save();
    res.status(201).json(savedBook);
  } catch (error) {
    res.status(500).json({ message: 'Error creating book', error });
  }
});

router.get('/', async (req, res) => {
    try {
        const page = req.query.page || 1;
        const limit = req.query.limit || 10;
        const skip = (page - 1) * limit;
        const totalBooks = await Book.countDocuments();
        const totalPages = Math.ceil(totalBooks / limit);

        const books = await Book.find()
            .sort({ createdAt: -1 })
            .populate('user', 'username profileImage') // Populate user details
            .skip(skip)
            .limit(limit);

            res.send({
                books,
                currentPage: page,
                totalPages: totalPages,
                totalBooks: totalBooks
            });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching books', error });
    }
})

router.delete('/:id', protectRoute, async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }

        if (book.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'You are not authorized to delete this book' });
        }

        // Delete the image from Cloudinary
        if (book.image && book.image.includes('cloudinary')) {
            try {
                const publicId = book.image.split('/').pop().split('.')[0]; // Extract public ID from URL
                await cloudinary.uploader.destroy(publicId);
            } catch (deleteError) {
                console.error('Error deleting image from Cloudinary:', error);
                return res.status(500).json({ message: 'Error deleting image from Cloudinary', error });
            }
        }

        await book.deleteOne();
        res.json(200).json({ message: 'Book deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting book', error });
    }
})

router.get('/user', protectRoute, async (req, res) => {
    try {
        const books = await Book.find({ user: req.user._id }).sort({ createdAt: -1});
        res.json(books);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user books', error });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const book = await Book.findById(req.params.id).populate('user', 'username profileImage');
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }
        res.json(book);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching book', error });
    }
});

export default router;