import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

// Register User
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(password, salt);

    await prisma.user.create({
      data: {
        name,
        email,
        password: passwordHash,
      },
    });


    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Login User
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({ message: 'User does not exist' });
    }

    // Check if the password is correct
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '2h' });
    res.cookie('jwt', token, { httpOnly: true });

    res.status(200).json({ message: 'Login successful' });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Fetch user profile (Protected Route)
export const user = async (req, res) => {
  try {
    const token = req.cookies['jwt'];

    if (!token) {
      return res.status(401).json({ message: 'Unauthenticated' });
    }

    const claims = jwt.verify(token, process.env.JWT_SECRET);

    if (!claims.id) {
      return res.status(401).json({ message: 'Unauthenticated' });
    }

    const user = await prisma.user.findUnique({
      where: { id: claims.id },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { password, ...data } = user;
    res.status(200).json(data);
  } catch (e) {
    console.error('Error fetching user:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Logout User
export const logout = async (req, res) => {
  try {
    res.cookie('jwt', '', { maxAge: 900000 });
    res.status(200).json({ message: 'Logout successful' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};
