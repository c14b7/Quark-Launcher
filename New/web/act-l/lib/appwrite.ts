// Appwrite configuration and client setup
import { Client, Account, Databases, ID, Query, OAuthProvider } from 'appwrite';

// Appwrite configuration
export const APPWRITE_CONFIG = {
  endpoint: 'https://fra.cloud.appwrite.io/v1',
  projectId: '680d15210002f3f65ea9',
  databaseId: 'quark_launcher_db',
  collections: {
    userProfiles: 'user_profiles',
    steamIntegrations: 'steam_integrations',
  }
};

// Initialize Appwrite Client
const client = new Client()
  .setEndpoint(APPWRITE_CONFIG.endpoint)
  .setProject(APPWRITE_CONFIG.projectId);

// Export services
export const account = new Account(client);
export const databases = new Databases(client);

// Helper to generate unique IDs
export const generateId = () => ID.unique();

// Authentication functions
export const authService = {
  // Register new user with email and password
  async register(email: string, password: string, name: string) {
    try {
      const newAccount = await account.create(
        generateId(),
        email,
        password,
        name
      );
      
      // Auto-login after registration
      await this.login(email, password);
      
      // Create user profile document
      await this.createUserProfile(newAccount.$id, email, name);
      
      return { success: true, user: newAccount };
    } catch (error: unknown) {
      const appwriteError = error as { message?: string; code?: number };
      console.error('Registration error:', error);
      return { 
        success: false, 
        error: appwriteError.message || 'Registration failed' 
      };
    }
  },

  // Login with email and password
  async login(email: string, password: string) {
    try {
      const session = await account.createEmailPasswordSession(email, password);
      return { success: true, session };
    } catch (error: unknown) {
      const appwriteError = error as { message?: string; code?: number };
      console.error('Login error:', error);
      return { 
        success: false, 
        error: appwriteError.message || 'Login failed' 
      };
    }
  },

  // Logout current session
  async logout() {
    try {
      await account.deleteSession('current');
      return { success: true };
    } catch (error: unknown) {
      const appwriteError = error as { message?: string; code?: number };
      console.error('Logout error:', error);
      return { 
        success: false, 
        error: appwriteError.message || 'Logout failed' 
      };
    }
  },

  // Get current user
  async getCurrentUser() {
    try {
      const user = await account.get();
      return { success: true, user };
    } catch {
      return { success: false, user: null };
    }
  },

  // Check if user is logged in
  async isLoggedIn() {
    try {
      await account.get();
      return true;
    } catch {
      return false;
    }
  },

  // Create user profile in database
  async createUserProfile(userId: string, email: string, name: string) {
    try {
      await databases.createDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.userProfiles,
        userId,
        {
          userId,
          email,
          name,
          createdAt: new Date().toISOString(),
          steamLinked: false,
          steamId: null,
          preferences: JSON.stringify({
            theme: 'dark',
            notifications: true,
            autoLogin: false,
          }),
        }
      );
      return { success: true };
    } catch (error: unknown) {
      const appwriteError = error as { message?: string; code?: number };
      console.error('Create profile error:', error);
      return { 
        success: false, 
        error: appwriteError.message || 'Failed to create profile' 
      };
    }
  },

  // Get user profile from database
  async getUserProfile(userId: string) {
    try {
      const profile = await databases.getDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.userProfiles,
        userId
      );
      return { success: true, profile };
    } catch (error: unknown) {
      const appwriteError = error as { message?: string; code?: number };
      console.error('Get profile error:', error);
      return { 
        success: false, 
        error: appwriteError.message || 'Failed to get profile' 
      };
    }
  },

  // Update user profile
  async updateUserProfile(userId: string, data: Record<string, unknown>) {
    try {
      const profile = await databases.updateDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.userProfiles,
        userId,
        data
      );
      return { success: true, profile };
    } catch (error: unknown) {
      const appwriteError = error as { message?: string; code?: number };
      console.error('Update profile error:', error);
      return { 
        success: false, 
        error: appwriteError.message || 'Failed to update profile' 
      };
    }
  },

  // Update password
  async updatePassword(newPassword: string, oldPassword: string) {
    try {
      await account.updatePassword(newPassword, oldPassword);
      return { success: true };
    } catch (error: unknown) {
      const appwriteError = error as { message?: string; code?: number };
      console.error('Update password error:', error);
      return { 
        success: false, 
        error: appwriteError.message || 'Failed to update password' 
      };
    }
  },

  // Update name
  async updateName(name: string) {
    try {
      await account.updateName(name);
      return { success: true };
    } catch (error: unknown) {
      const appwriteError = error as { message?: string; code?: number };
      console.error('Update name error:', error);
      return { 
        success: false, 
        error: appwriteError.message || 'Failed to update name' 
      };
    }
  },
};

// Steam Integration Service
export const steamService = {
  // Link Steam account to user profile
  async linkSteamAccount(userId: string, steamId: string, steamData: SteamLinkData) {
    try {
      // Check if Steam integration already exists
      const existingDocs = await databases.listDocuments(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.steamIntegrations,
        [Query.equal('userId', userId)]
      );

      if (existingDocs.documents.length > 0) {
        // Update existing
        await databases.updateDocument(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.collections.steamIntegrations,
          existingDocs.documents[0].$id,
          {
            steamId,
            personaName: steamData.personaName,
            avatarUrl: steamData.avatarUrl,
            profileUrl: steamData.profileUrl,
            linkedAt: new Date().toISOString(),
          }
        );
      } else {
        // Create new
        await databases.createDocument(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.collections.steamIntegrations,
          generateId(),
          {
            userId,
            steamId,
            personaName: steamData.personaName,
            avatarUrl: steamData.avatarUrl,
            profileUrl: steamData.profileUrl,
            linkedAt: new Date().toISOString(),
          }
        );
      }

      // Update user profile
      await databases.updateDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.userProfiles,
        userId,
        {
          steamLinked: true,
          steamId,
        }
      );

      return { success: true };
    } catch (error: unknown) {
      const appwriteError = error as { message?: string; code?: number };
      console.error('Link Steam error:', error);
      return { 
        success: false, 
        error: appwriteError.message || 'Failed to link Steam account' 
      };
    }
  },

  // Get Steam integration for user
  async getSteamIntegration(userId: string) {
    try {
      const docs = await databases.listDocuments(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.steamIntegrations,
        [Query.equal('userId', userId)]
      );

      if (docs.documents.length > 0) {
        return { success: true, integration: docs.documents[0] };
      }
      return { success: false, integration: null };
    } catch (error: unknown) {
      const appwriteError = error as { message?: string; code?: number };
      console.error('Get Steam integration error:', error);
      return { 
        success: false, 
        error: appwriteError.message || 'Failed to get Steam integration' 
      };
    }
  },

  // Unlink Steam account
  async unlinkSteamAccount(userId: string) {
    try {
      const docs = await databases.listDocuments(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.steamIntegrations,
        [Query.equal('userId', userId)]
      );

      if (docs.documents.length > 0) {
        await databases.deleteDocument(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.collections.steamIntegrations,
          docs.documents[0].$id
        );
      }

      // Update user profile
      await databases.updateDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.userProfiles,
        userId,
        {
          steamLinked: false,
          steamId: null,
        }
      );

      return { success: true };
    } catch (error: unknown) {
      const appwriteError = error as { message?: string; code?: number };
      console.error('Unlink Steam error:', error);
      return { 
        success: false, 
        error: appwriteError.message || 'Failed to unlink Steam account' 
      };
    }
  },
};

// Types
export interface SteamLinkData {
  personaName: string;
  avatarUrl: string;
  profileUrl: string;
}

export interface UserProfile {
  $id: string;
  userId: string;
  email: string;
  name: string;
  createdAt: string;
  steamLinked: boolean;
  steamId: string | null;
  preferences: string;
}

export interface SteamIntegration {
  $id: string;
  userId: string;
  steamId: string;
  personaName: string;
  avatarUrl: string;
  profileUrl: string;
  linkedAt: string;
}

export { Query, OAuthProvider };
