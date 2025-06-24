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
