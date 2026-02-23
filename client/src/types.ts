export type ProcessingStatus = 'idle' | 'parsing' | 'sending' | 'success' | 'error';

export interface UploadedFile {
    id: string;
    file: File;
    status: ProcessingStatus;
    message?: string;
    result?: any;
}
