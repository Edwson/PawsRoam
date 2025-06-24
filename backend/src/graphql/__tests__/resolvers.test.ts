import { resolvers } from '../resolvers'; // Adjust path
import { generateTextFromGemini } from '../../utils/gemini'; // Adjust path
import { GraphQLError } from 'graphql';

// Mock the generateTextFromGemini utility
jest.mock('../../utils/gemini', () => ({
  generateTextFromGemini: jest.fn(),
}));

// Mock pgPool for resolvers
const mockPgPoolQuery = jest.fn();
jest.mock('../../config/db', () => ({
  pgPool: {
    query: mockPgPoolQuery,
  },
}));


describe('GraphQL Resolvers', () => {
  const mockGenerateTextFromGemini = generateTextFromGemini as jest.Mock;

  beforeEach(() => {
    // Reset mocks before each test
    mockGenerateTextFromGemini.mockReset();
    mockPgPoolQuery.mockReset(); // Reset pgPool.query mock
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

    describe('getVenueById', () => {
      const mockVenueId = 'venue-uuid-123';
      const mockDbVenue = {
        id: mockVenueId,
        name: 'Test Venue',
        latitude: '40.7128',
        longitude: '-74.0060',
        weight_limit_kg: '10.5',
        created_at: new Date('2023-01-01T12:00:00.000Z'),
        updated_at: new Date('2023-01-02T12:00:00.000Z'),
        // ... other venue fields
      };
      const expectedGqlVenue = {
        ...mockDbVenue,
        latitude: 40.7128,
        longitude: -74.0060,
        weight_limit_kg: 10.5,
        created_at: '2023-01-01T12:00:00.000Z',
        updated_at: '2023-01-02T12:00:00.000Z',
      };

      it('should fetch and return a venue if found', async () => {
        mockPgPoolQuery.mockResolvedValueOnce({ rows: [mockDbVenue] });

        const result = await resolvers.Query.getVenueById!(null, { id: mockVenueId }, {}, {} as any);

        expect(mockPgPoolQuery).toHaveBeenCalledWith('SELECT * FROM venues WHERE id = $1', [mockVenueId]);
        expect(result).toEqual(expectedGqlVenue);
      });

      it('should throw GraphQLError if venue not found', async () => {
        mockPgPoolQuery.mockResolvedValueOnce({ rows: [] });

        try {
          await resolvers.Query.getVenueById!(null, { id: mockVenueId }, {}, {} as any);
        } catch (e: any) {
          expect(e).toBeInstanceOf(GraphQLError);
          expect(e.message).toBe('Venue not found');
          expect(e.extensions?.code).toBe('NOT_FOUND');
        }
        expect(mockPgPoolQuery).toHaveBeenCalledWith('SELECT * FROM venues WHERE id = $1', [mockVenueId]);
        expect.assertions(4);
      });

      it('should throw GraphQLError if database query fails', async () => {
        const dbError = new Error('DB query failed');
        mockPgPoolQuery.mockRejectedValueOnce(dbError);

        try {
          await resolvers.Query.getVenueById!(null, { id: mockVenueId }, {}, {} as any);
        } catch (e: any) {
          expect(e).toBeInstanceOf(GraphQLError);
          expect(e.message).toBe('Failed to fetch venue.');
          expect(e.extensions?.code).toBe('INTERNAL_SERVER_ERROR');
          expect(e.extensions?.originalError).toBe(dbError.message);
        }
        expect(mockPgPoolQuery).toHaveBeenCalledWith('SELECT * FROM venues WHERE id = $1', [mockVenueId]);
        expect.assertions(5);
      });
    });

    // TODO: Add tests for Venue.reviews field resolver
    // This would involve setting up a parent DbVenue object and mocking the query for reviews.
  });

  describe('Venue Field Resolvers', () => {
    describe('reviews', () => {
      const mockParentVenue = {
        id: 'venue-uuid-456',
        // Other parent venue fields are not strictly necessary for this field resolver test
        // as long as `id` is present.
      };
      const mockDbReview = {
        id: 'review-uuid-789',
        user_id: 'user-uuid-123',
        venue_id: mockParentVenue.id,
        rating: 5,
        comment: 'Great place!',
        visit_date: new Date('2023-02-15T00:00:00.000Z'),
        created_at: new Date('2023-02-16T10:00:00.000Z'),
        updated_at: new Date('2023-02-16T11:00:00.000Z'),
      };
      const expectedGqlReview = {
        ...mockDbReview,
        visit_date: '2023-02-15',
        created_at: '2023-02-16T10:00:00.000Z',
        updated_at: '2023-02-16T11:00:00.000Z',
      };

      it('should fetch and return reviews for the parent venue', async () => {
        mockPgPoolQuery.mockResolvedValueOnce({ rows: [mockDbReview] });

        // Ensure resolvers.Venue is defined and has a reviews method
        expect(resolvers.Venue).toBeDefined();
        expect(resolvers.Venue!.reviews).toBeInstanceOf(Function);

        const result = await resolvers.Venue!.reviews(mockParentVenue as any, {}, {}, {} as any);

        expect(mockPgPoolQuery).toHaveBeenCalledWith(
          'SELECT * FROM reviews WHERE venue_id = $1 ORDER BY created_at DESC',
          [mockParentVenue.id]
        );
        expect(result).toEqual([expectedGqlReview]);
      });

      it('should return an empty array if no reviews are found', async () => {
        mockPgPoolQuery.mockResolvedValueOnce({ rows: [] });

        const result = await resolvers.Venue!.reviews(mockParentVenue as any, {}, {}, {} as any);

        expect(result).toEqual([]);
        expect(mockPgPoolQuery).toHaveBeenCalledWith(
          'SELECT * FROM reviews WHERE venue_id = $1 ORDER BY created_at DESC',
          [mockParentVenue.id]
        );
      });

      it('should throw GraphQLError if database query for reviews fails', async () => {
        const dbError = new Error('DB review query failed');
        mockPgPoolQuery.mockRejectedValueOnce(dbError);

        try {
          await resolvers.Venue!.reviews(mockParentVenue as any, {}, {}, {} as any);
        } catch (e: any) {
          expect(e).toBeInstanceOf(GraphQLError);
          expect(e.message).toBe('Failed to fetch reviews for venue.');
          expect(e.extensions?.code).toBe('INTERNAL_SERVER_ERROR');
          expect(e.extensions?.originalError).toBe(dbError.message);
        }
        expect(mockPgPoolQuery).toHaveBeenCalledWith(
          'SELECT * FROM reviews WHERE venue_id = $1 ORDER BY created_at DESC',
          [mockParentVenue.id]
        );
        expect.assertions(5);
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
