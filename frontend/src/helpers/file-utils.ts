export enum FileType {
    TXT,
    PDF,
    DOC,
    DOCX,
    XLS,
    XLSX,
    PPT,
    PPTX,
    JPG,
    JPEG,
    PNG,
    WEBP,
    WEBM,
    GIF,
    BMP,
    TIFF,
    MP3,
    WAV,
    MP4,
    MOV,
    AVI,
    MKV
}

export const fileTypeMimeMap: { type: FileType; mimeType: string }[] = [
    { type: FileType.TXT,  mimeType: 'text/plain' },
    { type: FileType.PDF,  mimeType: 'application/pdf' },
    { type: FileType.DOC,  mimeType: 'application/msword' },
    { type: FileType.DOCX, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
    { type: FileType.XLS,  mimeType: 'application/vnd.ms-excel' },
    { type: FileType.XLSX, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    { type: FileType.PPT,  mimeType: 'application/vnd.ms-powerpoint' },
    { type: FileType.PPTX, mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
    { type: FileType.JPG,  mimeType: 'image/jpeg' },
    { type: FileType.JPEG, mimeType: 'image/jpeg' },
    { type: FileType.PNG,  mimeType: 'image/png' },
    { type: FileType.WEBP, mimeType: 'image/webp' },
    { type: FileType.GIF,  mimeType: 'image/gif' },
    { type: FileType.BMP,  mimeType: 'image/bmp' },
    { type: FileType.TIFF, mimeType: 'image/tiff' },
    { type: FileType.MP3,  mimeType: 'audio/mpeg' },
    { type: FileType.WAV,  mimeType: 'audio/wav' },
    { type: FileType.MP4,  mimeType: 'video/mp4' },
    { type: FileType.WEBM, mimeType: 'video/webm' },
    { type: FileType.MOV,  mimeType: 'video/quicktime' },
    { type: FileType.AVI,  mimeType: 'video/x-msvideo' },
    { type: FileType.MKV,  mimeType: 'video/x-matroska' }
];

export function getMimeTypes(fileTypes: FileType[]): string[] {
    return fileTypes
        .map(ft => fileTypeMimeMap.find(m => m.type === ft)?.mimeType)
        .filter((mt): mt is string => !!mt);
}
