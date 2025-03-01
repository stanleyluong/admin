// Types for working with images and Firebase Storage

export interface ImageMetadata {
  contentType: string;
  size?: number;
  timeCreated?: string;
  updated?: string;
  md5Hash?: string;
  customMetadata?: Record<string, string>;
}

export interface UploadTask {
  snapshot: {
    ref: {
      fullPath: string;
    };
    bytesTransferred: number;
    totalBytes: number;
    state: 'running' | 'paused' | 'success' | 'canceled' | 'error';
  };
  on: (
    event: string,
    nextOrObserver: (snapshot: any) => void,
    error?: (error: Error) => void,
    complete?: () => void
  ) => () => void;
  then: (
    onFulfilled?: (snapshot: any) => any,
    onRejected?: (error: Error) => any
  ) => Promise<any>;
  catch: (onRejected: (error: Error) => any) => Promise<any>;
  resume: () => void;
  pause: () => void;
  cancel: () => void;
}

export interface StorageReference {
  bucket: string;
  fullPath: string;
  name: string;
  parent: StorageReference | null;
  root: StorageReference;
  toString: () => string;
}

export interface ImageUploadResult {
  filename: string;
  path: string;
  fullPath: string;
  downloadUrl: string;
  metadata: ImageMetadata;
  ref: StorageReference;
}

export interface ImageUploadProgress {
  progress: number;
  bytesTransferred: number;
  totalBytes: number;
  state: 'running' | 'paused' | 'success' | 'canceled' | 'error';
}

// Used for tracking local image paths to Firebase Storage URLs
export interface ImageMapping {
  localPath: string;
  storagePath: string;
  downloadUrl: string;
  type: 'project' | 'certificate' | 'profile' | 'testimonial';
  entityId?: string;
  thumbnailPath?: string;
  thumbnailUrl?: string;
}