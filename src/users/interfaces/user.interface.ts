export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  roles?: string[];
  createdAt?: Date;
  updatedAt: Date;
  reading?: {
    epubUrl: string;
    bookmark: string;
  };
  authenticate?: (password) => boolean;
}
