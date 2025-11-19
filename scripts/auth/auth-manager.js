/**
 * Authentication Manager
 * Handles all Firebase authentication operations
 * Provides login, logout, and auth state management
 */

import { auth } from './firebase-init.js';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
} from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js';

// Re-export validation functions (no Firebase dependencies)
export { isValidEmail, validatePassword } from './auth-validator.js';

/**
 * Sign in with Google OAuth
 * @returns {Promise<object>} User object
 */
export async function signInWithGoogle() {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);

    return {
      user: result.user,
      credential: GoogleAuthProvider.credentialFromResult(result),
    };
  } catch (err) {
    console.error('Google sign-in failed:', err);
    throw createAuthError(err);
  }
}

/**
 * Sign in with email and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<object>} User object
 */
export async function signInWithEmail(email, password) {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (err) {
    console.error('Email sign-in failed:', err);
    throw createAuthError(err);
  }
}

/**
 * Create new account with email and password
 * @param {string} email
 * @param {string} password
 * @param {string} [displayName] - Optional display name
 * @returns {Promise<object>} User object
 */
export async function signUpWithEmail(email, password, displayName = null) {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);

    // Set display name if provided
    if (displayName && result.user) {
      await updateProfile(result.user, { displayName });
    }

    // Send verification email
    if (result.user) {
      await sendEmailVerification(result.user);
    }

    return result.user;
  } catch (err) {
    console.error('Email sign-up failed:', err);
    throw createAuthError(err);
  }
}

/**
 * Sign out current user
 * @returns {Promise<void>}
 */
export async function signOut() {
  try {
    await firebaseSignOut(auth);
  } catch (err) {
    console.error('Sign-out failed:', err);
    throw createAuthError(err);
  }
}

/**
 * Send password reset email
 * @param {string} email
 * @returns {Promise<void>}
 */
export async function resetPassword(email) {
  if (!email) {
    throw new Error('Email is required');
  }

  try {
    await sendPasswordResetEmail(auth, email);
  } catch (err) {
    console.error('Password reset failed:', err);
    throw createAuthError(err);
  }
}

/**
 * Get current authenticated user
 * @returns {object|null} Current user or null
 */
export function getCurrentUser() {
  return auth.currentUser;
}

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
export function isAuthenticated() {
  return auth.currentUser !== null;
}

/**
 * Subscribe to authentication state changes
 * @param {Function} callback - Called with user object when auth state changes
 * @returns {Function} Unsubscribe function
 */
export function onAuthChange(callback) {
  if (typeof callback !== 'function') {
    throw new Error('Callback must be a function');
  }

  return onAuthStateChanged(auth, (user) => {
    try {
      callback(user);
    } catch (err) {
      console.error('Auth state change callback error:', err);
    }
  });
}

/**
 * Update user profile
 * @param {object} updates - Profile updates (displayName, photoURL)
 * @returns {Promise<void>}
 */
export async function updateUserProfile(updates) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error('No user signed in');
  }

  if (!updates || typeof updates !== 'object') {
    throw new Error('Updates object is required');
  }

  try {
    await updateProfile(user, updates);

    // Force reload to get updated profile
    await user.reload();
  } catch (err) {
    console.error('Profile update failed:', err);
    throw createAuthError(err);
  }
}

/**
 * Resend email verification
 * @returns {Promise<void>}
 */
export async function resendVerificationEmail() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error('No user signed in');
  }

  if (user.emailVerified) {
    throw new Error('Email is already verified');
  }

  try {
    await sendEmailVerification(user);
  } catch (err) {
    console.error('Failed to resend verification email:', err);
    throw createAuthError(err);
  }
}

/**
 * Reload current user data
 * @returns {Promise<object>} Updated user object
 */
export async function reloadUser() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error('No user signed in');
  }

  try {
    await user.reload();
    return auth.currentUser;
  } catch (err) {
    console.error('User reload failed:', err);
    throw createAuthError(err);
  }
}

/**
 * Create user-friendly error from Firebase auth error
 * @param {Error} err - Firebase error
 * @returns {Error} User-friendly error
 * @private
 */
function createAuthError(err) {
  const code = err.code || '';
  let message = err.message;

  // Map Firebase error codes to user-friendly messages
  const errorMessages = {
    'auth/invalid-email': 'Invalid email address',
    'auth/user-disabled': 'This account has been disabled',
    'auth/user-not-found': 'No account found with this email',
    'auth/wrong-password': 'Incorrect password',
    'auth/email-already-in-use': 'Email is already registered',
    'auth/weak-password': 'Password is too weak (minimum 6 characters)',
    'auth/operation-not-allowed': 'This sign-in method is not enabled',
    'auth/popup-closed-by-user': 'Sign-in popup was closed',
    'auth/popup-blocked': 'Sign-in popup was blocked by browser',
    'auth/too-many-requests': 'Too many failed attempts. Please try again later',
    'auth/network-request-failed': 'Network error. Please check your connection',
    'auth/requires-recent-login': 'Please sign in again to continue',
  };

  if (errorMessages[code]) {
    message = errorMessages[code];
  }

  const error = new Error(message);
  error.code = code;
  error.originalError = err;

  return error;
}

/**
 * Validate email format
 * @param {string} email
 * @returns {boolean}
 */
// isValidEmail and validatePassword are now in auth-validator.js and re-exported above

/**
 * Extract user profile information
 * @param {object} firebaseUser - Firebase user object
 * @returns {object} Simplified user profile
 */
export function extractUserProfile(firebaseUser) {
  if (!firebaseUser) {
    return null;
  }

  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName || null,
    photoURL: firebaseUser.photoURL || null,
    emailVerified: firebaseUser.emailVerified,
    isAnonymous: firebaseUser.isAnonymous,
    metadata: {
      creationTime: firebaseUser.metadata.creationTime,
      lastSignInTime: firebaseUser.metadata.lastSignInTime,
    },
    providerData: firebaseUser.providerData.map(provider => ({
      providerId: provider.providerId,
      uid: provider.uid,
      displayName: provider.displayName,
      email: provider.email,
      photoURL: provider.photoURL,
    })),
  };
}
