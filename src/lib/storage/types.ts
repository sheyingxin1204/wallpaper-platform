export interface CreateUploadUrlInput {
  key: string;
  contentType: string;
  expiresInSeconds: number;
}

export interface StorageService {
  createUploadUrl(input: CreateUploadUrlInput): Promise<string>;
  getPublicUrl(key: string): string;
  deleteObject(key: string): Promise<void>;
}
