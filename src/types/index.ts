// Common types
export type FirebaseTimestamp = {
  seconds: number;
  nanoseconds: number;
};

// Project type
export interface Project {
  id?: string;              // Document ID in Firestore
  title: string;            // Project title
  category: string;         // Project category
  image: string;            // Main image path/URL
  url: string;              // Project URL or image path
  images?: string[];        // Array of image paths/URLs for gallery
  description?: string;     // Project description
  technologies?: string[];  // Technologies used
  featured?: boolean;       // Whether the project is featured
  order?: number;           // Display order
  createdAt?: FirebaseTimestamp;
  updatedAt?: FirebaseTimestamp;
}

// Certificate type
export interface Certificate {
  id?: string;              // Document ID in Firestore
  school: string;           // Institution name
  course: string;           // Course/certificate name
  image: string;            // Image path/URL
  date?: string;            // Date awarded
  description?: string;     // Additional description
  url?: string;             // Link to certificate verification
  createdAt?: FirebaseTimestamp;
  updatedAt?: FirebaseTimestamp;
}

// Education type
export interface Education {
  id?: string;              // Document ID in Firestore
  school: string;           // School/institution name
  degree: string;           // Degree type (e.g., "Certificate", "Degree")
  graduated: string;        // Graduation date or status (e.g., "2015", "In Progress")
  description: string;      // Description of the degree or focus area
  startDate?: string;       // Start date
  endDate?: string;         // End date
  createdAt?: FirebaseTimestamp;
  updatedAt?: FirebaseTimestamp;
}

// Address type for Profile
export interface Address {
  street?: string;
  city: string;
  state: string;
  zip?: string;
  country?: string;
}

// Social media link type
export interface SocialLink {
  name: string;             // Platform name (e.g., "linkedin", "github")
  url: string;              // Profile URL
  className: string;        // CSS class name for icon
}

// Profile type
export interface Profile {
  id?: string;              // Document ID in Firestore
  name: string;             // Full name
  occupation: string[];     // List of occupations/titles
  description: string;      // Short description/tagline
  bio: string;              // Longer biography
  contactmessage: string;   // Message for contact section
  email: string;            // Email address
  phone?: string;           // Phone number
  address: Address;         // Location information
  website: string;          // Personal website URL
  resumedownload: string;   // Resume download URL
  image: string;            // Profile image path/URL
  social: SocialLink[];     // Social media links
  createdAt?: FirebaseTimestamp;
  updatedAt?: FirebaseTimestamp;
}

// Skill type
export interface Skill {
  id?: string;              // Document ID in Firestore
  name: string;             // Skill name
  level: string;            // Proficiency level (e.g., "90%")
  category?: string;        // Category (e.g., "Frontend", "Backend")
  icon?: string;            // Icon class or URL
  createdAt?: FirebaseTimestamp;
  updatedAt?: FirebaseTimestamp;
}

// Work experience type
export interface Work {
  id?: string;              // Document ID in Firestore
  company: string;          // Company name
  title: string;            // Job title
  years: string;            // Duration in years (e.g., "January 2020 - July 2022")
  description: string[];    // Array of description points
  startDate?: string;       // Start date (ISO format)
  endDate?: string;         // End date (ISO format) or "Present"
  location?: string;        // Job location
  technologies?: string[];  // Technologies used
  achievements?: string[];  // Key achievements
  createdAt?: FirebaseTimestamp;
  updatedAt?: FirebaseTimestamp;
}

// Testimonial type
export interface Testimonial {
  id?: string;              // Document ID in Firestore
  text: string;             // Testimonial text
  user: string;             // Person who gave the testimonial
  company?: string;         // Company of the person
  position?: string;        // Position of the person
  image?: string;           // Avatar image
  createdAt?: FirebaseTimestamp;
  updatedAt?: FirebaseTimestamp;
}

// Combined resume data type
export interface ResumeData {
  skillmessage?: string;
  education: Education[];
  work: Work[];
  skills: Skill[];
  certificates: Certificate[];
}

// Complete portfolio data structure
export interface PortfolioData {
  main: Profile;
  resume: ResumeData;
  portfolio: {
    projects: Project[];
  };
  testimonials: {
    testimonials: Testimonial[];
  };
}