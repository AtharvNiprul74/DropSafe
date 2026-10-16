import { EP } from '../endpoints';
import { get, post } from '../http';
import type { ImportPreview, ImportReport, ImportSession } from '../../types/models';
import type { ImportType } from '../../types/enums';

export interface ImportWithReport extends ImportSession {
  report?: ImportReport;
  preview?: ImportPreview;
}

export const listImports = () => get<ImportWithReport[]>(EP.imports.path);
export const getImport = (id: string) => get<ImportWithReport>(EP.importSession(id).path);

export const createImport = (body: { importType: ImportType; fileName: string; fileSizeBytes?: number; mimeType?: string }) =>
  post<ImportSession>(EP.createImport.path, body);

export const validateImport = (id: string) => post<ImportWithReport>(EP.validateImport(id).path);
export const processImport = (id: string) => post<ImportWithReport>(EP.processImport(id).path);
export const cancelImport = (id: string) => post<ImportSession>(EP.cancelImport(id).path);
