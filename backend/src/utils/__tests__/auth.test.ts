import { generateToken, verifyToken, hashPassword, comparePassword } from '../auth'; // Adjust path as necessary
import jwt from 'jsonwebtoken';

// Mock the JWT_SECRET for consistent testing if it's complex or from env
// If it's simple and defined in auth.ts, this might not be strictly needed,
// but good practice if it could change or is sensitive.
const MOCK_JWT_SECRET = 'your-super-secret-key'; // Should match the one in auth.ts or be mocked there

describe('Auth Utilities', () => {
  describe('generateToken and verifyToken', () => {
    const userPayload = { id: '123', email: 'test@example.com' };

    it('should generate a valid JWT token', () => {
      const token = generateToken(userPayload);
      expect(token).toEqual(expect.any(String));

      // Verify the token structure (optional, but can be useful)
      const decoded = jwt.decode(token);
      expect(decoded).toMatchObject({
        userId: userPayload.id,
        email: userPayload.email,
      });
    });

    it('should verify a valid token correctly', () => {
      // Use the MOCK_JWT_SECRET if process.env.JWT_SECRET is not available or consistent in test env
      // For this test, we assume generateToken uses the same secret logic internally
      const token = generateToken(userPayload);
      const decodedPayload = verifyToken(token);

      expect(decodedPayload).not.toBeNull();
      expect(decodedPayload?.userId).toBe(userPayload.id);
      expect(decodedPayload?.email).toBe(userPayload.email);
    });

    it('should return null for an invalid or expired token', () => {
      const invalidToken = 'this.is.an.invalid.token';
      expect(verifyToken(invalidToken)).toBeNull();

      // Create an expired token (expires in 1 millisecond)
      const expiredToken = jwt.sign(userPayload, MOCK_JWT_SECRET, { expiresIn: '1ms' });

      // Wait for token to expire
      return new Promise(resolve => {
        setTimeout(() => {
          expect(verifyToken(expiredToken)).toBeNull();
          resolve(null);
        }, 100); // Wait 100ms, should be enough for 1ms expiry
      });
    });
  });

  describe('hashPassword and comparePassword', () => {
    const plainPassword = 'password123';

    it('should hash a password and then successfully compare it', async () => {
      const hashedPassword = await hashPassword(plainPassword);
      expect(hashedPassword).toEqual(expect.any(String));
      expect(hashedPassword).not.toBe(plainPassword);

      const isMatch = await comparePassword(plainPassword, hashedPassword);
      expect(isMatch).toBe(true);
    });

    it('should return false when comparing a wrong password', async () => {
      const hashedPassword = await hashPassword(plainPassword);
      const isMatch = await comparePassword('wrongpassword', hashedPassword);
      expect(isMatch).toBe(false);
    });
  });
});
