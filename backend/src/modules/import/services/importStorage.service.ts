import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { prisma } from '../../../config/database';
import { ImportFile } from '@prisma/client';
import { ConflictError, NotFoundError, ValidationError } from '../../../core/errors/AppError';

export interface UploadedFileData {
  originalFilename: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export class ImportStorageService {
  private readonly uploadBaseDir: string;

  constructor() {
    this.uploadBaseDir = path.join(process.cwd(), 'uploads', 'imports');
    if (!fs.existsSync(this.uploadBaseDir)) {
      fs.mkdirSync(this.uploadBaseDir, { recursive: true });
    }
  }

  /**
   * Compute SHA-256 hash of buffer
   */
  public computeHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Save uploaded file to disk and record metadata with SHA-256 integrity check
   */
  public async saveImportFile(
    sessionId: string,
    file: UploadedFileData
  ): Promise<ImportFile> {
    if (!file.buffer || file.buffer.length === 0) {
      throw new ValidationError('Uploaded file is empty');
    }

    // 1. Calculate SHA-256 file hash
    const fileHash = this.computeHash(file.buffer);

    // 2. Integrity check: import_session_id + file_hash uniqueness
    const existingFile = await prisma.importFile.findUnique({
      where: {
        import_session_id_file_hash: {
          import_session_id: sessionId,
          file_hash: fileHash,
        },
      },
    });

    if (existingFile) {
      throw new ConflictError(
        `File integrity check failed: A file with identical SHA-256 hash (${fileHash}) has already been uploaded to this session`
      );
    }

    // 3. Save physical file to disk
    const sessionDir = path.join(this.uploadBaseDir, sessionId);
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    const safeFilename = `${fileHash}_${file.originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const storageKey = path.join(sessionDir, safeFilename);
    fs.writeFileSync(storageKey, file.buffer);

    // 4. Create database record
    return prisma.importFile.create({
      data: {
        import_session_id: sessionId,
        original_filename: file.originalFilename,
        storage_key: storageKey,
        file_size: file.size,
        file_hash: fileHash,
        mime_type: file.mimetype,
      },
    });
  }

  /**
   * Get file content buffer for an import session
   */
  public async getFileBuffer(sessionId: string, fileId?: string): Promise<{ buffer: Buffer; file: ImportFile }> {
    const file = fileId
      ? await prisma.importFile.findFirst({ where: { id: fileId, import_session_id: sessionId } })
      : await prisma.importFile.findFirst({
          where: { import_session_id: sessionId },
          orderBy: { created_at: 'desc' },
        });

    if (!file) {
      throw new NotFoundError(`No import file found for session '${sessionId}'`);
    }

    if (!fs.existsSync(file.storage_key)) {
      throw new NotFoundError(`Physical storage file for import file '${file.id}' not found on server`);
    }

    const buffer = fs.readFileSync(file.storage_key);
    return { buffer, file };
  }
}

export const importStorageService = new ImportStorageService();
