import { resolvers } from '../resolvers'; // Adjust path
import { generateTextFromGemini } from '../../utils/gemini'; // Adjust path
import { ensureShopOwnerOrAdmin } from '../../utils/auth'; // Import for mocking
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

// Mock specific auth functions if they are used directly by resolvers being tested
jest.mock('../../utils/auth', () => {
  const originalAuth = jest.requireActual('../../utils/auth');
  return {
    ...originalAuth, // Preserve other exports from auth.ts
    ensureAdmin: jest.fn(), // Mock ensureAdmin
    ensureShopOwnerOrAdmin: jest.fn(), // Mock ensureShopOwnerOrAdmin
  };
});


describe('GraphQL Resolvers', () => {
  const mockGenerateTextFromGemini = generateTextFromGemini as jest.Mock;
  const mockEnsureAdmin = ensureAdmin as jest.Mock; // Typed mock
  const mockEnsureShopOwnerOrAdmin = ensureShopOwnerOrAdmin as jest.Mock; // Typed mock


  beforeEach(() => {
    // Reset mocks before each test
    mockGenerateTextFromGemini.mockReset();
    mockPgPoolQuery.mockReset(); // Reset pgPool.query mock
    mockEnsureAdmin.mockReset(); // Reset ensureAdmin mock
    mockEnsureShopOwnerOrAdmin.mockReset(); // Reset ensureShopOwnerOrAdmin mock
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
  describe('Mutation Resolvers', () => {
    // Mock context for an admin user
    const adminContext = { userId: 'admin-user-id' };
    // Mock context for a non-admin user
    const nonAdminContext = { userId: 'non-admin-user-id' };
    // Mock context for no user
    const noAuthContext = { userId: null };

    // Mock ensureAdmin behavior by mocking pgPool.query for user role check
    const mockAdminUserRole = () => mockPgPoolQuery.mockResolvedValueOnce({ rows: [{ role: 'admin' }] });
    const mockNonAdminUserRole = () => mockPgPoolQuery.mockResolvedValueOnce({ rows: [{ role: 'user' }] });
    const mockUserNotFound = () => mockPgPoolQuery.mockResolvedValueOnce({ rows: [] });


    describe('adminCreateVenue', () => {
      const venueInput = {
        name: "Admin Cafe",
        type: "cafe",
        latitude: 35.123,
        longitude: 139.456,
        // ... other required fields from AdminCreateVenueInput
      };
      const dbResponseVenue = {
        ...venueInput,
        id: 'new-venue-id',
        owner_user_id: null,
        status: 'pending_approval',
        created_at: new Date(),
        updated_at: new Date(),
        // ... fill out all fields as they would come from DB
      };
       const expectedGqlVenue = {
        ...dbResponseVenue,
        latitude: 35.123, // ensure float
        longitude: 139.456, // ensure float
        weight_limit_kg: null, // if not provided
        created_at: dbResponseVenue.created_at.toISOString(),
        updated_at: dbResponseVenue.updated_at.toISOString(),
      };


      it('should allow admin to create a venue', async () => {
        mockAdminUserRole(); // User is admin
        mockPgPoolQuery.mockResolvedValueOnce({ rows: [dbResponseVenue] }); // DB insert response

        const result = await resolvers.Mutation!.adminCreateVenue!(null, { input: venueInput }, adminContext, {} as any);

        expect(mockPgPoolQuery).toHaveBeenCalledTimes(2); // 1 for role check, 1 for insert
        expect(mockPgPoolQuery.mock.calls[1][0]).toContain('INSERT INTO venues');
        // Loop through keys of venueInput to check if they are included in the values array (mock.calls[1][1])
        const dbArgs = mockPgPoolQuery.mock.calls[1][1];
        expect(dbArgs).toContain(venueInput.name);
        expect(dbArgs).toContain(venueInput.type);
        expect(dbArgs).toContain(venueInput.latitude);
        expect(dbArgs).toContain(venueInput.longitude);

        expect(result).toEqual(expectedGqlVenue);
      });

      it('should prevent non-admin from creating a venue', async () => {
        mockNonAdminUserRole(); // User is not admin

        await expect(
          resolvers.Mutation!.adminCreateVenue!(null, { input: venueInput }, nonAdminContext, {} as any)
        ).rejects.toThrow(new GraphQLError('User is not authorized to perform this action', { extensions: { code: 'FORBIDDEN' }}));
        expect(mockPgPoolQuery).toHaveBeenCalledTimes(1); // Only role check
      });

       it('should prevent unauthenticated user from creating a venue', async () => {
        // ensureAdmin will throw 'User is not authenticated' before role check query
        await expect(
          resolvers.Mutation!.adminCreateVenue!(null, { input: venueInput }, noAuthContext, {} as any)
        ).rejects.toThrow(new GraphQLError('User is not authenticated', { extensions: { code: 'UNAUTHENTICATED' }}));
        expect(mockPgPoolQuery).not.toHaveBeenCalled(); // No DB calls
      });

      it('should handle database error during venue creation', async () => {
        mockAdminUserRole();
        mockPgPoolQuery.mockRejectedValueOnce(new Error('DB insert failed')); // DB insert fails

        await expect(
          resolvers.Mutation!.adminCreateVenue!(null, { input: venueInput }, adminContext, {} as any)
        ).rejects.toThrow(new GraphQLError('Failed to create venue.', { extensions: { code: 'INTERNAL_SERVER_ERROR' }}));
        expect(mockPgPoolQuery).toHaveBeenCalledTimes(2);
      });
    });

    describe('adminUpdateVenue', () => {
      const venueId = 'venue-to-update-id';
      const updateInput = { name: "Updated Cafe Name", status: "active" };
      const dbResponseUpdatedVenue = {
        id: venueId,
        name: "Updated Cafe Name",
        type: "cafe", // Assuming original type
        latitude: 35.123,
        longitude: 139.456,
        status: "active",
        created_at: new Date(), // Should be original created_at
        updated_at: new Date(), // Should be new updated_at
        // ... other fields
      };
       const expectedGqlUpdatedVenue = {
        ...dbResponseUpdatedVenue,
         latitude: 35.123,
         longitude: 139.456,
         weight_limit_kg: null,
        created_at: dbResponseUpdatedVenue.created_at.toISOString(),
        updated_at: dbResponseUpdatedVenue.updated_at.toISOString(),
      };

      it('should allow admin to update a venue', async () => {
        mockAdminUserRole();
        mockPgPoolQuery.mockResolvedValueOnce({ rows: [dbResponseUpdatedVenue] }); // DB update response

        const result = await resolvers.Mutation!.adminUpdateVenue!(null, { id: venueId, input: updateInput }, adminContext, {} as any);

        expect(mockPgPoolQuery).toHaveBeenCalledTimes(2);
        const updateQueryCall = mockPgPoolQuery.mock.calls[1];
        expect(updateQueryCall[0]).toContain('UPDATE venues SET');
        expect(updateQueryCall[0]).toContain('name = $1');
        expect(updateQueryCall[0]).toContain('status = $2');
        expect(updateQueryCall[0]).toContain('updated_at = CURRENT_TIMESTAMP');
        expect(updateQueryCall[1]).toEqual([updateInput.name, updateInput.status, venueId]);
        expect(result).toEqual(expectedGqlUpdatedVenue);
      });

      it('should throw error if venue not found during update', async () => {
        mockAdminUserRole();
        mockPgPoolQuery.mockResolvedValueOnce({ rows: [] }); // DB update returns no rows

        await expect(
          resolvers.Mutation!.adminUpdateVenue!(null, { id: venueId, input: updateInput }, adminContext, {} as any)
        ).rejects.toThrow(new GraphQLError('Venue not found or update failed', { extensions: { code: 'NOT_FOUND' }}));
      });
       it('should prevent non-admin from updating a venue', async () => {
        mockNonAdminUserRole();
        await expect(
            resolvers.Mutation!.adminUpdateVenue!(null, { id: venueId, input: updateInput }, nonAdminContext, {} as any)
        ).rejects.toThrow(new GraphQLError('User is not authorized to perform this action', { extensions: { code: 'FORBIDDEN' }}));
        expect(mockPgPoolQuery).toHaveBeenCalledTimes(1); // Only role check
      });
    });

    describe('adminDeleteVenue', () => {
      const venueId = 'venue-to-delete-id';

      it('should allow admin to delete a venue', async () => {
        mockAdminUserRole();
        mockPgPoolQuery.mockResolvedValueOnce({ rowCount: 1 }); // DB delete response

        const result = await resolvers.Mutation!.adminDeleteVenue!(null, { id: venueId }, adminContext, {} as any);

        expect(mockPgPoolQuery).toHaveBeenCalledTimes(2);
        expect(mockPgPoolQuery.mock.calls[1][0]).toContain('DELETE FROM venues WHERE id = $1');
        expect(mockPgPoolQuery.mock.calls[1][1]).toEqual([venueId]);
        expect(result).toBe(true);
      });

      it('should return false if venue not found for deletion', async () => {
        mockAdminUserRole();
        mockPgPoolQuery.mockResolvedValueOnce({ rowCount: 0 }); // DB delete returns 0 rows

        const result = await resolvers.Mutation!.adminDeleteVenue!(null, { id: venueId }, adminContext, {} as any);
        expect(result).toBe(false);
      });

      it('should handle foreign key constraint error during deletion', async () => {
        mockAdminUserRole();
        const dbError = new Error('FK violation');
        (dbError as any).code = '23503'; // Simulate PostgreSQL FK error code
        mockPgPoolQuery.mockRejectedValueOnce(dbError);

        await expect(
          resolvers.Mutation!.adminDeleteVenue!(null, { id: venueId }, adminContext, {} as any)
        ).rejects.toThrow(new GraphQLError('Cannot delete venue. It may have associated reviews or other dependent data.', {
            extensions: { code: 'BAD_REQUEST' },
        }));
      });
       it('should prevent non-admin from deleting a venue', async () => {
        mockNonAdminUserRole();
        await expect(
            resolvers.Mutation!.adminDeleteVenue!(null, { id: venueId }, nonAdminContext, {} as any)
        ).rejects.toThrow(new GraphQLError('User is not authorized to perform this action', { extensions: { code: 'FORBIDDEN' }}));
        expect(mockPgPoolQuery).toHaveBeenCalledTimes(1); // Only role check
      });
    });

    describe('updateUserProfilePicture', () => {
      const mockUserId = 'user-123';
      const authenticatedContext = { userId: mockUserId };
      const newImageUrl = 'http://example.com/new-avatar.jpg';
      const mockDbUser = {
        id: mockUserId,
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        status: 'active',
        created_at: new Date('2023-01-01T00:00:00.000Z'),
        updated_at: new Date('2023-01-01T00:00:00.000Z'), // Original updated_at
        // password_hash is not returned by resolver directly
      };

      it('should update user avatar_url and return updated user', async () => {
        // Mock the SELECT query to fetch user details
        mockPgPoolQuery.mockResolvedValueOnce({ rows: [mockDbUser] });
        // The actual UPDATE query is conceptual, so no mock for it, but we check the console log.
        const consoleSpy = jest.spyOn(console, 'log');

        const result = await resolvers.Mutation!.updateUserProfilePicture!(
          null,
          { imageUrl: newImageUrl },
          authenticatedContext,
          {} as any
        );

        expect(mockPgPoolQuery).toHaveBeenCalledWith('SELECT * FROM users WHERE id = $1', [mockUserId]);
        expect(consoleSpy).toHaveBeenCalledWith(`Conceptually updated avatar_url for user ${mockUserId} to ${newImageUrl}`);

        expect(result.id).toBe(mockUserId);
        expect(result.avatar_url).toBe(newImageUrl);
        expect(result.email).toBe(mockDbUser.email);
        expect(new Date(result.updated_at).getTime()).toBeGreaterThan(mockDbUser.updated_at.getTime()); // Check updated_at is newer

        consoleSpy.mockRestore();
      });

      it('should throw error if user is not authenticated', async () => {
        await expect(
          resolvers.Mutation!.updateUserProfilePicture!(null, { imageUrl: newImageUrl }, noAuthContext, {} as any)
        ).rejects.toThrow(new GraphQLError('User is not authenticated', { extensions: { code: 'UNAUTHENTICATED' } }));
        expect(mockPgPoolQuery).not.toHaveBeenCalled();
      });

      it('should throw error if user not found in DB (after auth check)', async () => {
        mockPgPoolQuery.mockResolvedValueOnce({ rows: [] }); // User not found by SELECT

        await expect(
          resolvers.Mutation!.updateUserProfilePicture!(
            null,
            { imageUrl: newImageUrl },
            authenticatedContext, // Assume userId is valid from token
            {} as any
          )
        ).rejects.toThrow(new GraphQLError('User not found.', { extensions: { code: 'NOT_FOUND' } }));
        expect(mockPgPoolQuery).toHaveBeenCalledWith('SELECT * FROM users WHERE id = $1', [mockUserId]);
      });
       it('should handle database error during user fetch', async () => {
        mockPgPoolQuery.mockRejectedValueOnce(new Error('DB SELECT failed'));

        await expect(
          resolvers.Mutation!.updateUserProfilePicture!(
            null, { imageUrl: newImageUrl }, authenticatedContext, {} as any)
        ).rejects.toThrow(new GraphQLError('Failed to update profile picture.', { extensions: { code: 'INTERNAL_SERVER_ERROR' }}));
      });
    });

    describe('updatePetAvatar', () => {
      const mockUserId = 'user-owner-123';
      const authenticatedContext = { userId: mockUserId };
      const mockPetId = 'pet-abc-789';
      const newPetImageUrl = 'http://example.com/new-pet-avatar.jpg';

      const mockOwnedDbPet = {
        id: mockPetId,
        user_id: mockUserId,
        name: 'Buddy',
        species: 'Dog',
        avatar_url: 'http://example.com/old-buddy.jpg',
        created_at: new Date('2023-02-01T00:00:00.000Z'),
        updated_at: new Date('2023-02-01T00:00:00.000Z'),
        birthdate: new Date('2022-01-01T00:00:00.000Z'),
      };
       const mockNotOwnedDbPet = {
        id: 'pet-def-456',
        user_id: 'other-user-id', // Different user
        name: 'Shadow',
        species: 'Cat',
        avatar_url: null,
        created_at: new Date(),
        updated_at: new Date(),
        birthdate: null,
      };

      it('should update avatar_url for an owned pet and return the updated pet', async () => {
        // Mock 1: Pet ownership check (SELECT user_id FROM pets WHERE id = $1)
        mockPgPoolQuery.mockResolvedValueOnce({ rows: [{ user_id: mockUserId }] });
        // Mock 2: Pet update (UPDATE pets SET avatar_url = $1 ... RETURNING *)
        const updatedDbPetResponse = { ...mockOwnedDbPet, avatar_url: newPetImageUrl, updated_at: new Date() };
        mockPgPoolQuery.mockResolvedValueOnce({ rows: [updatedDbPetResponse] });

        const result = await resolvers.Mutation!.updatePetAvatar!(
          null,
          { petId: mockPetId, imageUrl: newPetImageUrl },
          authenticatedContext,
          {} as any
        );
        expect(mockPgPoolQuery).toHaveBeenCalledTimes(2);
        expect(mockPgPoolQuery.mock.calls[0][0]).toBe('SELECT user_id FROM pets WHERE id = $1');
        expect(mockPgPoolQuery.mock.calls[0][1]).toEqual([mockPetId]);
        expect(mockPgPoolQuery.mock.calls[1][0]).toBe('UPDATE pets SET avatar_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3 RETURNING *;');
        expect(mockPgPoolQuery.mock.calls[1][1]).toEqual([newPetImageUrl, mockPetId, mockUserId]);

        expect(result.id).toBe(mockPetId);
        expect(result.avatar_url).toBe(newPetImageUrl);
        expect(result.name).toBe(mockOwnedDbPet.name);
         expect(new Date(result.updated_at).getTime()).toBeGreaterThan(mockOwnedDbPet.updated_at.getTime());
      });

      it('should throw error if user is not authenticated', async () => {
        await expect(
          resolvers.Mutation!.updatePetAvatar!(null, { petId: mockPetId, imageUrl: newPetImageUrl }, noAuthContext, {} as any)
        ).rejects.toThrow(new GraphQLError('User is not authenticated', { extensions: { code: 'UNAUTHENTICATED' } }));
        expect(mockPgPoolQuery).not.toHaveBeenCalled();
      });

      it('should throw error if pet not found', async () => {
        mockPgPoolQuery.mockResolvedValueOnce({ rows: [] }); // Pet ownership check finds no pet

        await expect(
          resolvers.Mutation!.updatePetAvatar!(
            null, { petId: 'non-existent-pet-id', imageUrl: newPetImageUrl }, authenticatedContext, {} as any)
        ).rejects.toThrow(new GraphQLError('Pet not found.', { extensions: { code: 'NOT_FOUND' } }));
        expect(mockPgPoolQuery).toHaveBeenCalledTimes(1);
      });

      it('should throw error if user does not own the pet', async () => {
        mockPgPoolQuery.mockResolvedValueOnce({ rows: [{ user_id: 'other-user-id-456' }] }); // Pet owned by someone else

        await expect(
          resolvers.Mutation!.updatePetAvatar!(
            null, { petId: mockNotOwnedDbPet.id, imageUrl: newPetImageUrl }, authenticatedContext, {} as any)
        ).rejects.toThrow(new GraphQLError('User not authorized to update this pet.', { extensions: { code: 'FORBIDDEN' } }));
        expect(mockPgPoolQuery).toHaveBeenCalledTimes(1);
      });

      it('should handle database error during pet update', async () => {
        mockPgPoolQuery.mockResolvedValueOnce({ rows: [{ user_id: mockUserId }] }); // Ownership check passes
        mockPgPoolQuery.mockRejectedValueOnce(new Error('DB UPDATE failed')); // Update fails

        await expect(
          resolvers.Mutation!.updatePetAvatar!(
            null, { petId: mockPetId, imageUrl: newPetImageUrl }, authenticatedContext, {} as any)
        ).rejects.toThrow(new GraphQLError('Failed to update pet avatar.', { extensions: { code: 'INTERNAL_SERVER_ERROR' }}));
         expect(mockPgPoolQuery).toHaveBeenCalledTimes(2); // Both ownership check and update attempt
      });
    });

    describe('adminUpdateVenueImage', () => {
      const mockVenueId = 'venue-xyz-123';
      const newImageUrl = 'http://example.com/new-venue-image.jpg';
      const mockExistingVenue = {
        id: mockVenueId,
        name: 'Test Venue',
        type: 'cafe',
        latitude: 34.05,
        longitude: -118.25,
        created_at: new Date('2023-03-01T00:00:00.000Z'),
        updated_at: new Date('2023-03-01T00:00:00.000Z'),
        // other necessary fields for DbVenue
      };

      it('should allow admin to update venue image_url and return updated venue', async () => {
        mockAdminUserRole(); // User is admin
        // Mock for the SELECT query to fetch venue details
        mockPgPoolQuery.mockResolvedValueOnce({ rows: [mockExistingVenue] });
        const consoleSpy = jest.spyOn(console, 'log');

        const result = await resolvers.Mutation!.adminUpdateVenueImage!(
          null,
          { venueId: mockVenueId, imageUrl: newImageUrl },
          adminContext,
          {} as any
        );

        expect(mockPgPoolQuery).toHaveBeenCalledTimes(2); // Role check + SELECT venue
        expect(mockPgPoolQuery.mock.calls[1][0]).toBe('SELECT * FROM venues WHERE id = $1');
        expect(mockPgPoolQuery.mock.calls[1][1]).toEqual([mockVenueId]);
        expect(consoleSpy).toHaveBeenCalledWith(`Conceptually updated image_url for venue ${mockVenueId} to ${newImageUrl}`);

        expect(result.id).toBe(mockVenueId);
        expect(result.image_url).toBe(newImageUrl);
        expect(result.name).toBe(mockExistingVenue.name);
        expect(new Date(result.updated_at).getTime()).toBeGreaterThan(mockExistingVenue.updated_at.getTime());

        consoleSpy.mockRestore();
      });

      it('should throw error if user is not admin', async () => {
        mockNonAdminUserRole();
        await expect(
          resolvers.Mutation!.adminUpdateVenueImage!(null, { venueId: mockVenueId, imageUrl: newImageUrl }, nonAdminContext, {} as any)
        ).rejects.toThrow(new GraphQLError('User is not authorized to perform this action', { extensions: { code: 'FORBIDDEN' }}));
        expect(mockPgPoolQuery).toHaveBeenCalledTimes(1); // Only role check
      });

      it('should throw error if venue not found', async () => {
        mockAdminUserRole();
        mockPgPoolQuery.mockResolvedValueOnce({ rows: [] }); // Venue not found by SELECT

        await expect(
          resolvers.Mutation!.adminUpdateVenueImage!(null, { venueId: 'non-existent-id', imageUrl: newImageUrl }, adminContext, {} as any)
        ).rejects.toThrow(new GraphQLError('Venue not found.', { extensions: { code: 'NOT_FOUND' } }));
        expect(mockPgPoolQuery).toHaveBeenCalledTimes(2); // Role check + SELECT attempt
      });

      it('should handle database error during venue fetch for image update', async () => {
        mockAdminUserRole();
        mockPgPoolQuery.mockRejectedValueOnce(new Error('DB SELECT failed')); // SELECT fails

        await expect(
          resolvers.Mutation!.adminUpdateVenueImage!(null, { venueId: mockVenueId, imageUrl: newImageUrl }, adminContext, {} as any)
        ).rejects.toThrow(new GraphQLError('Failed to update venue image.', { extensions: { code: 'INTERNAL_SERVER_ERROR' }}));
        expect(mockPgPoolQuery).toHaveBeenCalledTimes(2); // Role check + SELECT attempt
      });
    });

    describe('myOwnedVenues', () => {
      const mockShopOwnerContext = { userId: 'shop-owner-id-123' };
      const mockAdminActingAsShopOwnerContext = { userId: 'admin-id-acting-as-shop-owner' };

      const mockDbVenues = [
        { id: 'venue-1', name: 'My Cafe', owner_user_id: 'shop-owner-id-123', latitude: '35.0', longitude: '139.0', created_at: new Date(), updated_at: new Date(), type: 'cafe' },
        { id: 'venue-2', name: 'My Park', owner_user_id: 'shop-owner-id-123', latitude: '35.1', longitude: '139.1', created_at: new Date(), updated_at: new Date(), type: 'park' },
      ];
      const expectedGqlVenues = mockDbVenues.map(v => ({
          ...v,
          latitude: parseFloat(v.latitude),
          longitude: parseFloat(v.longitude),
          weight_limit_kg: null, // Assuming not in mockDbVenues
          created_at: v.created_at.toISOString(),
          updated_at: v.updated_at.toISOString(),
          image_url: undefined, // Or null if that's the default
      }));


      it('should return venues owned by the authenticated shop owner', async () => {
        mockEnsureShopOwnerOrAdmin.mockResolvedValue({ userId: mockShopOwnerContext.userId, role: 'business_owner' });
        mockPgPoolQuery.mockResolvedValueOnce({ rows: mockDbVenues });

        const result = await resolvers.Query.myOwnedVenues!(null, {}, mockShopOwnerContext, {} as any);

        expect(mockEnsureShopOwnerOrAdmin).toHaveBeenCalledWith(mockShopOwnerContext);
        expect(mockPgPoolQuery).toHaveBeenCalledWith('SELECT * FROM venues WHERE owner_user_id = $1 ORDER BY name ASC', [mockShopOwnerContext.userId]);
        expect(result.length).toBe(2);
        expect(result[0].name).toBe('My Cafe');
        // Check a few transformed fields
        expect(result[0].latitude).toBe(35.0);
        expect(result[1].created_at).toBe(mockDbVenues[1].created_at.toISOString());
      });

      it('should allow admin to use myOwnedVenues (returns venues for that admin if they own any)', async () => {
        mockEnsureShopOwnerOrAdmin.mockResolvedValue({ userId: mockAdminActingAsShopOwnerContext.userId, role: 'admin' });
        mockPgPoolQuery.mockResolvedValueOnce({ rows: [] }); // Admin owns no venues in this test

        const result = await resolvers.Query.myOwnedVenues!(null, {}, mockAdminActingAsShopOwnerContext, {} as any);

        expect(mockEnsureShopOwnerOrAdmin).toHaveBeenCalledWith(mockAdminActingAsShopOwnerContext);
        expect(mockPgPoolQuery).toHaveBeenCalledWith('SELECT * FROM venues WHERE owner_user_id = $1 ORDER BY name ASC', [mockAdminActingAsShopOwnerContext.userId]);
        expect(result).toEqual([]);
      });

      it('should throw error if user is not authenticated for myOwnedVenues', async () => {
        mockEnsureShopOwnerOrAdmin.mockRejectedValue(new GraphQLError('User is not authenticated', { extensions: { code: 'UNAUTHENTICATED' }}));

        await expect(
            resolvers.Query.myOwnedVenues!(null, {}, {userId: null} as any, {} as any)
        ).rejects.toThrow('User is not authenticated');
        expect(mockPgPoolQuery).not.toHaveBeenCalled();
      });
    });

    describe('adminUpdateUser', () => {
      const targetUserId = 'user-to-update-id';
      const updateInput = { role: 'business_owner', status: 'active' };
      const mockDbUserUpdated = {
        id: targetUserId,
        email: 'test@example.com',
        name: 'Test User',
        role: 'business_owner',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
        // avatar_url might be undefined if not part of DbUser yet
      };
      const expectedGqlUser = {
        ...mockDbUserUpdated,
        avatar_url: undefined, // Explicitly undefined if not in DbUser/User type for this test
        created_at: mockDbUserUpdated.created_at.toISOString(),
        updated_at: mockDbUserUpdated.updated_at.toISOString(),
      };

      it('should allow admin to update a user role and status', async () => {
        mockAdminUserRole(); // Current user is admin
        mockPgPoolQuery.mockResolvedValueOnce({ rows: [mockDbUserUpdated] }); // DB update response

        const result = await resolvers.Mutation!.adminUpdateUser!(
          null,
          { userId: targetUserId, input: updateInput },
          adminContext,
          {} as any
        );

        expect(mockPgPoolQuery).toHaveBeenCalledTimes(2); // Role check + UPDATE user
        const updateQueryCall = mockPgPoolQuery.mock.calls[1];
        expect(updateQueryCall[0]).toContain('UPDATE users SET role = $1, status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3');
        expect(updateQueryCall[1]).toEqual([updateInput.role, updateInput.status, targetUserId]);
        expect(result).toEqual(expectedGqlUser);
      });

      it('should prevent non-admin from updating a user', async () => {
        mockNonAdminUserRole();
        await expect(
          resolvers.Mutation!.adminUpdateUser!(null, { userId: targetUserId, input: updateInput }, nonAdminContext, {} as any)
        ).rejects.toThrow(new GraphQLError('User is not authorized to perform this action', { extensions: { code: 'FORBIDDEN' }}));
        expect(mockPgPoolQuery).toHaveBeenCalledTimes(1); // Only role check
      });

      it('should throw error if user to update is not found', async () => {
        mockAdminUserRole();
        mockPgPoolQuery.mockResolvedValueOnce({ rows: [] }); // User not found by UPDATE

        await expect(
          resolvers.Mutation!.adminUpdateUser!(null, { userId: targetUserId, input: updateInput }, adminContext, {} as any)
        ).rejects.toThrow(new GraphQLError('User not found or update failed', { extensions: { code: 'NOT_FOUND' }}));
      });

      it('should throw error if trying to update email to an existing one', async () => {
        mockAdminUserRole();
        const emailUpdateInput = { email: 'existing@example.com' };
        const dbError = new Error('Unique constraint violation');
        (dbError as any).code = '23505'; // PostgreSQL unique violation
        (dbError as any).constraint = 'users_email_key';
        mockPgPoolQuery.mockRejectedValueOnce(dbError);

        await expect(
          resolvers.Mutation!.adminUpdateUser!(null, { userId: targetUserId, input: emailUpdateInput }, adminContext, {} as any)
        ).rejects.toThrow(new GraphQLError('Email address is already in use by another account.', { extensions: { code: 'BAD_USER_INPUT' }}));
      });
    });

    describe('shopOwnerCreateVenue', () => {
        const mockShopOwnerContext = { userId: 'shop-owner-id-for-create', role: 'business_owner'};
        const venueInput = { // AdminCreateVenueInput
            name: "Shop Owner's New Cafe",
            type: "cafe",
            latitude: 36.0,
            longitude: 140.0,
            // ... other fields as per AdminCreateVenueInput, status can be omitted to test default
        };
        const dbResponseVenue = {
            ...venueInput,
            id: 'new-shop-venue-id',
            owner_user_id: mockShopOwnerContext.userId, // This will be set by resolver
            status: 'pending_approval', // Default status
            created_at: new Date(),
            updated_at: new Date(),
            image_url: null, // Assuming new venues don't have image_url by default
        };
        const expectedGqlVenue = {
            ...dbResponseVenue,
            latitude: 36.0,
            longitude: 140.0,
            weight_limit_kg: null,
            created_at: dbResponseVenue.created_at.toISOString(),
            updated_at: dbResponseVenue.updated_at.toISOString(),
            image_url: undefined, // Or null depending on GQL type and if it's in DbVenue
        };

        it('should allow a shop owner to create a venue, setting owner_user_id and default status', async () => {
            mockEnsureShopOwnerOrAdmin.mockResolvedValue({ userId: mockShopOwnerContext.userId, role: 'business_owner' });
            mockPgPoolQuery.mockResolvedValueOnce({ rows: [dbResponseVenue] });

            const result = await resolvers.Mutation!.shopOwnerCreateVenue!(null, { input: venueInput }, mockShopOwnerContext, {} as any);

            expect(mockEnsureShopOwnerOrAdmin).toHaveBeenCalledWith(mockShopOwnerContext);
            expect(mockPgPoolQuery).toHaveBeenCalledTimes(1); // ensureShopOwnerOrAdmin is mocked not to call DB itself in this test setup

            const dbCallArgs = mockPgPoolQuery.mock.calls[0][1];
            expect(dbCallArgs[0]).toBe(mockShopOwnerContext.userId); // owner_user_id
            expect(dbCallArgs[1]).toBe(venueInput.name); // name
            expect(dbCallArgs[26]).toBe('pending_approval'); // status (assuming it's the 27th arg)

            expect(result).toEqual(expectedGqlVenue);
        });

        it('should allow an admin to use shopOwnerCreateVenue, setting owner_user_id to admin ID', async () => {
            const adminAsShopOwnerContext = { userId: 'admin-acting-as-creator', role: 'admin'};
            mockEnsureShopOwnerOrAdmin.mockResolvedValue({ userId: adminAsShopOwnerContext.userId, role: 'admin' });
            const adminOwnedDbResponse = {...dbResponseVenue, owner_user_id: adminAsShopOwnerContext.userId};
            mockPgPoolQuery.mockResolvedValueOnce({ rows: [adminOwnedDbResponse] });

            const result = await resolvers.Mutation!.shopOwnerCreateVenue!(null, { input: venueInput }, adminAsShopOwnerContext, {} as any);

            expect(mockEnsureShopOwnerOrAdmin).toHaveBeenCalledWith(adminAsShopOwnerContext);
            const dbCallArgs = mockPgPoolQuery.mock.calls[0][1];
            expect(dbCallArgs[0]).toBe(adminAsShopOwnerContext.userId); // owner_user_id is admin's
            expect(result.owner_user_id).toBe(adminAsShopOwnerContext.userId);
        });

        it('should throw error if a non-shop-owner/non-admin tries to create a venue', async () => {
            const regularUserContext = { userId: 'regular-user-id', role: 'user'};
            mockEnsureShopOwnerOrAdmin.mockRejectedValue(new GraphQLError('User is not authorized for this shop owner action', { extensions: { code: 'FORBIDDEN' }}));

            await expect(
                 resolvers.Mutation!.shopOwnerCreateVenue!(null, { input: venueInput }, regularUserContext, {} as any)
            ).rejects.toThrow('User is not authorized for this shop owner action');
            expect(mockPgPoolQuery).not.toHaveBeenCalled();
        });
    });

    describe('shopOwnerUpdateVenueDetails', () => {
      const mockShopOwnerContext = { userId: 'shop-owner-id-for-update', role: 'business_owner' };
      const mockAdminContext = { userId: 'admin-id-for-update', role: 'admin' };
      const venueId = 'venue-to-update-by-owner';
      const updateInput = { name: "Owner Updated Cafe Name", type: "cafe" }; // ShopOwnerUpdateVenueInput

      const mockCurrentVenueOwned = { id: venueId, owner_user_id: mockShopOwnerContext.userId, name: "Original Name", type: "restaurant", latitude: '30.0', longitude: '130.0', created_at: new Date(), updated_at: new Date() };
      const mockUpdatedVenueResponse = { ...mockCurrentVenueOwned, ...updateInput, updated_at: new Date() };

      it('should allow a shop owner to update their own venue', async () => {
        mockEnsureShopOwnerOrAdmin.mockResolvedValue(mockShopOwnerContext);
        mockPgPoolQuery.mockResolvedValueOnce({ rows: [mockCurrentVenueOwned] }); // For ownership check
        mockPgPoolQuery.mockResolvedValueOnce({ rows: [mockUpdatedVenueResponse] }); // For update

        const result = await resolvers.Mutation!.shopOwnerUpdateVenueDetails!(null, { venueId, input: updateInput }, mockShopOwnerContext, {} as any);

        expect(mockEnsureShopOwnerOrAdmin).toHaveBeenCalledWith(mockShopOwnerContext);
        expect(mockPgPoolQuery).toHaveBeenCalledTimes(2);
        expect(mockPgPoolQuery.mock.calls[0][0]).toBe('SELECT owner_user_id FROM venues WHERE id = $1'); // Ownership check query
        expect(mockPgPoolQuery.mock.calls[0][1]).toEqual([venueId]);
        expect(mockPgPoolQuery.mock.calls[1][0]).toContain('UPDATE venues SET name = $1, type = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3');
        expect(mockPgPoolQuery.mock.calls[1][1]).toEqual([updateInput.name, updateInput.type, venueId]);
        expect(result.name).toBe(updateInput.name);
        expect(result.type).toBe(updateInput.type);
      });

      it('should prevent shop owner from updating status or owner_user_id (fields not in ShopOwnerUpdateVenueInput)', async () => {
        mockEnsureShopOwnerOrAdmin.mockResolvedValue(mockShopOwnerContext);
        mockPgPoolQuery.mockResolvedValueOnce({ rows: [mockCurrentVenueOwned] });
        mockPgPoolQuery.mockResolvedValueOnce({ rows: [mockUpdatedVenueResponse] });

        // Input includes status and owner_user_id, but resolver should ignore them for SET clause
        const maliciousInput = { ...updateInput, status: 'active', owner_user_id: 'another-user-id' };
        await resolvers.Mutation!.shopOwnerUpdateVenueDetails!(null, { venueId, input: maliciousInput }, mockShopOwnerContext, {} as any);

        const updateQuery = mockPgPoolQuery.mock.calls[1][0] as string;
        expect(updateQuery).not.toContain('status =');
        expect(updateQuery).not.toContain('owner_user_id =');
      });

      it('should prevent shop owner from updating a venue they do not own', async () => {
        mockEnsureShopOwnerOrAdmin.mockResolvedValue(mockShopOwnerContext);
        mockPgPoolQuery.mockResolvedValueOnce({ rows: [{ owner_user_id: 'different-owner-id' }] }); // Venue owned by someone else

        await expect(
          resolvers.Mutation!.shopOwnerUpdateVenueDetails!(null, { venueId, input: updateInput }, mockShopOwnerContext, {} as any)
        ).rejects.toThrow(new GraphQLError('User not authorized to update this venue.', { extensions: { code: 'FORBIDDEN' }}));
        expect(mockPgPoolQuery).toHaveBeenCalledTimes(1); // Only ownership check
      });

      it('should allow admin to update any venue via shopOwnerUpdateVenueDetails (if ownership check is bypassed for admin)', async () => {
        mockEnsureShopOwnerOrAdmin.mockResolvedValue(mockAdminContext);
        // No ownership check query mock needed here as admin bypasses it in resolver logic
        mockPgPoolQuery.mockResolvedValueOnce({ rows: [mockUpdatedVenueResponse] }); // For update

        await resolvers.Mutation!.shopOwnerUpdateVenueDetails!(null, { venueId, input: updateInput }, mockAdminContext, {} as any);
        expect(mockPgPoolQuery).toHaveBeenCalledTimes(1); // Only the UPDATE query
        expect(mockPgPoolQuery.mock.calls[0][0]).toContain('UPDATE venues SET name = $1, type = $2');
      });
    });

    describe('shopOwnerUpdateVenueImage', () => {
        const mockShopOwnerContext = { userId: 'shop-owner-id-for-image-update', role: 'business_owner' };
        const venueId = 'venue-for-image-update';
        const newImageUrl = 'http://example.com/new-shop-venue.jpg';
        const mockCurrentVenue = { id: venueId, owner_user_id: mockShopOwnerContext.userId, name: "Shop's Venue", latitude: '10.0', longitude: '10.0', type: 'store', created_at: new Date(), updated_at: new Date() };

        it('should allow shop owner to update their venue image', async () => {
            mockEnsureShopOwnerOrAdmin.mockResolvedValue(mockShopOwnerContext);
            mockPgPoolQuery.mockResolvedValueOnce({ rows: [mockCurrentVenue] }); // Ownership check
            mockPgPoolQuery.mockResolvedValueOnce({ rows: [mockCurrentVenue] }); // SELECT after conceptual update

            const consoleSpy = jest.spyOn(console, 'log');
            const result = await resolvers.Mutation!.shopOwnerUpdateVenueImage!(null, { venueId, imageUrl: newImageUrl }, mockShopOwnerContext, {} as any);

            expect(mockEnsureShopOwnerOrAdmin).toHaveBeenCalledWith(mockShopOwnerContext);
            expect(mockPgPoolQuery).toHaveBeenCalledTimes(2); // Ownership check + final SELECT
            expect(consoleSpy).toHaveBeenCalledWith(`Conceptually updated image_url for venue ${venueId} to ${newImageUrl} by user ${mockShopOwnerContext.userId}`);
            expect(result.image_url).toBe(newImageUrl);
            consoleSpy.mockRestore();
        });

        it('should prevent shop owner from updating image of a venue they do not own', async () => {
            mockEnsureShopOwnerOrAdmin.mockResolvedValue(mockShopOwnerContext);
            mockPgPoolQuery.mockResolvedValueOnce({ rows: [{ owner_user_id: 'another-owner' }] }); // Different owner

            await expect(
                resolvers.Mutation!.shopOwnerUpdateVenueImage!(null, { venueId, imageUrl: newImageUrl }, mockShopOwnerContext, {} as any)
            ).rejects.toThrow('User not authorized to update image for this venue.');
            expect(mockPgPoolQuery).toHaveBeenCalledTimes(1); // Only ownership check
        });
    });
  });

  // Test for getPetCareAdvice
  describe('Query Resolvers - PawsAI', () => {
    const disclaimer = "\n\n--- \n**Disclaimer:** I am an AI assistant and this advice is for informational purposes only. It is not a substitute for professional veterinary consultation. Always consult a qualified veterinarian for any health concerns or before making any decisions related to your pet's health.";

    describe('getPetCareAdvice', () => {
      beforeEach(() => {
        // Reset generateTextFromGemini mock specifically for these tests
        (generateTextFromGemini as jest.Mock).mockReset();
      });

      it('should call generateTextFromGemini with correct prompt and append disclaimer', async () => {
        process.env.GEMINI_API_KEY = 'test-key';
        const question = "How often should I feed my puppy?";
        const mockAdvice = "Puppies should be fed three to four times a day.";
        (generateTextFromGemini as jest.Mock).mockResolvedValue(mockAdvice);

        const result = await resolvers.Query.getPetCareAdvice(null, { question }, {}, {} as any);

        expect(generateTextFromGemini).toHaveBeenCalledTimes(1);
        const calledPrompt = (generateTextFromGemini as jest.Mock).mock.calls[0][0];
        expect(calledPrompt).toContain(question);
        expect(calledPrompt).toContain("You are PawsAI, a friendly and knowledgeable virtual pet care assistant");
        expect(result).toBe(mockAdvice + disclaimer);
      });

      it('should return API key error message if not configured, with disclaimer', async () => {
        delete process.env.GEMINI_API_KEY; // Ensure key is not set
        const question = "Is chocolate bad for dogs?";

        const result = await resolvers.Query.getPetCareAdvice(null, { question }, {}, {} as any);

        expect(result).toBe("PawsAI Pet Care Advisor is currently unavailable (API key not configured)." + disclaimer); // Resolver prepends its own message here.
        expect(generateTextFromGemini).not.toHaveBeenCalled();
      });

      it('should throw GraphQLError if question is empty', async () => {
        process.env.GEMINI_API_KEY = 'test-key';
        await expect(
          resolvers.Query.getPetCareAdvice(null, { question: "  " }, {}, {} as any)
        ).rejects.toThrow(new GraphQLError('Question cannot be empty.', { extensions: { code: 'BAD_USER_INPUT' }}));
        expect(generateTextFromGemini).not.toHaveBeenCalled();
      });

      it('should handle Gemini API errors gracefully and append disclaimer', async () => {
        process.env.GEMINI_API_KEY = 'test-key';
        const question = "Why is the sky blue for my cat?";
        const geminiErrorMessage = "Gemini API Error: Some specific error from Gemini.";
        (generateTextFromGemini as jest.Mock).mockResolvedValue(geminiErrorMessage); // generateTextFromGemini itself returns a formatted error string

        const result = await resolvers.Query.getPetCareAdvice(null, { question }, {}, {} as any);
        expect(result).toBe(geminiErrorMessage + disclaimer);
      });

      it('should handle Gemini API throwing an actual error and append disclaimer to thrown GQL error', async () => {
        process.env.GEMINI_API_KEY = 'test-key';
        const question = "Why is the sky blue for my cat?";
        const thrownErrorMessage = "Gemini API Error: Network issue.";
        (generateTextFromGemini as jest.Mock).mockRejectedValue(new Error(thrownErrorMessage));

        try {
            await resolvers.Query.getPetCareAdvice(null, { question }, {}, {} as any);
        } catch(e: any) {
            expect(e).toBeInstanceOf(GraphQLError);
            expect(e.message).toBe(thrownErrorMessage + disclaimer);
            expect(e.extensions.code).toBe('INTERNAL_SERVER_ERROR');
        }
        expect.assertions(3);
      });

      it('should return a polite refusal if Gemini indicates it cannot answer, with disclaimer', async () => {
        process.env.GEMINI_API_KEY = 'test-key';
        const question = "A very complex medical question.";
        const mockRefusal = "I'm unable to provide specific medical advice.";
        (generateTextFromGemini as jest.Mock).mockResolvedValue(mockRefusal);

        const result = await resolvers.Query.getPetCareAdvice(null, { question }, {}, {} as any);
        expect(result).toBe("I'm sorry, I can't provide specific advice on that topic. For detailed pet care questions, especially regarding health, it's always best to consult a professional veterinarian." + disclaimer);
      });
    });
  });
});
