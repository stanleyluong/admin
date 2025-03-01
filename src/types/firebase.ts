// Firebase related types

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

export interface FirebaseUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
}

export interface FirestoreCollection {
  main: string;
  education: string;
  work: string;
  skills: string;
  certificates: string;
  projects: string;
  testimonials: string;
  imageMappings: string;
}

// Migration related types
export interface DataMigrationResult {
  main?: boolean;
  education?: {
    total: number;
    success: number;
  };
  work?: {
    total: number;
    success: number;
  };
  skills?: {
    total: number;
    success: number;
  };
  certificates?: {
    total: number;
    success: number;
  };
  projects?: {
    total: number;
    success: number;
  };
  testimonials?: {
    total: number;
    success: number;
  };
}

export interface ImageMigrationResult {
  profile?: boolean;
  projects?: {
    total: number;
    success: number;
    failed: number;
    skipped: number;
    updatedProjects: number;
  };
  certificates?: {
    total: number;
    success: number;
    failed: number;
    skipped: number;
    updatedCertificates: number;
  };
  testimonials?: {
    total: number;
    success: number;
    failed: number;
  };
}

// Default collection names
export const DEFAULT_COLLECTIONS: FirestoreCollection = {
  main: 'main',
  education: 'education',
  work: 'work',
  skills: 'skills',
  certificates: 'certificates',
  projects: 'projects',
  testimonials: 'testimonials',
  imageMappings: 'imageMappings'
};