export interface Participant {
  id?: number;
  fullName: string;
  email: string;
  phone?: string;
  institution?: string;
  createdAt?: Date;
}