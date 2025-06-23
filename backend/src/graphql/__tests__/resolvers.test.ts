import { resolvers } from '../resolvers'; // Adjust path
import { generateTextFromGemini } from '../../utils/gemini'; // Adjust path
import { GraphQLError } from 'graphql';

// Mock the generateTextFromGemini utility
jest.mock('../../utils/gemini', () => ({
  generateTextFromGemini: jest.fn(),
}));

// Mock pgPool for resolvers that might use it (though testGemini doesn't directly, auth ones do)
jest.mock('../../config/db', () => ({
  pgPool: {
    query: jest.fn(),
  },
}));


describe('GraphQL Resolvers', () => {
  const mockGenerateTextFromGemini = generateTextFromGemini as jest.Mock;

  beforeEach(() => {
    // Reset mocks before each test
    mockGenerateTextFromGemini.mockReset();
    // Clear environment variables for GEMINI_API_KEY or set them as needed per test
    delete process.env.GEMINI_API_KEY;
  });

  describe('Query Resolvers', () => {
    describe('testGemini', () => {
      it('should call generateTextFromGemini and return its result when API key is present', async () => {
        process.env.GEMINI_API_KEY = 'test-api-key';
        const mockPrompt = 'Hello Gemini!';
        const mockResponse = 'Hello from Gemini!';
        mockGenerateTextFromGemini.mockResolvedValue(mockResponse);

        // Access the resolver function directly
        // Resolvers typically have signature: (parent, args, context, info)
        const result = await resolvers.Query.testGemini(null, { prompt: mockPrompt }, {}, {} as any);

        expect(mockGenerateTextFromGemini).toHaveBeenCalledWith(mockPrompt);
        expect(result).toBe(mockResponse);
      });

      it('should return a message if GEMINI_API_KEY is not configured', async () => {
        const mockPrompt = 'Hello Gemini!';
        // Ensure GEMINI_API_KEY is not set (done in beforeEach or explicitly here)
        // delete process.env.GEMINI_API_KEY;

        const result = await resolvers.Query.testGemini(null, { prompt: mockPrompt }, {}, {} as any);
        expect(result).toBe("Gemini API key not configured on the server.");
        expect(mockGenerateTextFromGemini).not.toHaveBeenCalled();
      });

      it('should throw GraphQLError if prompt is empty', async () => {
        process.env.GEMINI_API_KEY = 'test-api-key';
        try {
          await resolvers.Query.testGemini(null, { prompt: '' }, {}, {} as any);
        } catch (e: any) {
          expect(e).toBeInstanceOf(GraphQLError);
          expect(e.message).toBe('Prompt cannot be empty');
          expect(e.extensions?.code).toBe('BAD_USER_INPUT');
        }
        expect.assertions(3); // Ensure the catch block was hit
      });

      it('should throw GraphQLError if generateTextFromGemini throws an error', async () => {
        process.env.GEMINI_API_KEY = 'test-api-key';
        const mockPrompt = 'Test prompt';
        const errorMessage = 'Gemini internal error';
        mockGenerateTextFromGemini.mockRejectedValue(new Error(errorMessage));

        try {
          await resolvers.Query.testGemini(null, { prompt: mockPrompt }, {}, {} as any);
        } catch (e: any) {
          expect(e).toBeInstanceOf(GraphQLError);
          expect(e.message).toBe(errorMessage); // Or your custom error message from resolver
          expect(e.extensions?.code).toBe('INTERNAL_SERVER_ERROR');
        }
        expect(mockGenerateTextFromGemini).toHaveBeenCalledWith(mockPrompt);
        expect.assertions(4); // Ensure the catch block was hit + mock call
      });
    });

    describe('_empty query', () => {
        it('should return the placeholder string', () => {
            const result = resolvers.Query._empty(null, {}, {}, {} as any);
            expect(result).toBe("This is a placeholder query.");
        });
    });
  });

  // Add describe blocks for Mutation resolvers (e.g., registerUser, loginUser)
  // These would require more complex mocking for pgPool.query
  // For example:
  // describe('Mutation Resolvers', () => {
  //   describe('registerUser', () => {
  //     // Test cases for registerUser
  //   });
  // });
});
