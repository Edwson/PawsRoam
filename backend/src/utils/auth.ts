import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key'; // IMPORTANT: Use a strong secret from env variables in production
const SALT_ROUNDS = 10;

interface UserPayload {
  userId: string;
  email: string;
}

export const generateToken = (user: { id: string; email: string }): string => {
  const payload: UserPayload = {
    userId: user.id,
    email: user.email,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' }); // Token expires in 1 day
};

export const verifyToken = (token: string): UserPayload | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;
    return decoded;
  } catch (error) {
    console.error('Invalid token:', error);
    return null;
  }
};

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

// Utility to get user ID from Authorization header (Bearer token)
// This would typically be used in context creation for Apollo Server
export const getUserIdFromAuthHeader = (authHeader?: string): string | null => {
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    if (token) {
      const decoded = verifyToken(token);
      return decoded ? decoded.userId : null;
    }
  }
  return null;
};
