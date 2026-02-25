export var FileType;
(function (FileType) {
    FileType[FileType["TXT"] = 0] = "TXT";
    FileType[FileType["PDF"] = 1] = "PDF";
    FileType[FileType["DOC"] = 2] = "DOC";
    FileType[FileType["DOCX"] = 3] = "DOCX";
    FileType[FileType["XLS"] = 4] = "XLS";
    FileType[FileType["XLSX"] = 5] = "XLSX";
    FileType[FileType["PPT"] = 6] = "PPT";
    FileType[FileType["PPTX"] = 7] = "PPTX";
    FileType[FileType["JPG"] = 8] = "JPG";
    FileType[FileType["JPEG"] = 9] = "JPEG";
    FileType[FileType["PNG"] = 10] = "PNG";
    FileType[FileType["WEBP"] = 11] = "WEBP";
    FileType[FileType["WEBM"] = 12] = "WEBM";
    FileType[FileType["GIF"] = 13] = "GIF";
    FileType[FileType["BMP"] = 14] = "BMP";
    FileType[FileType["TIFF"] = 15] = "TIFF";
    FileType[FileType["MP3"] = 16] = "MP3";
    FileType[FileType["WAV"] = 17] = "WAV";
    FileType[FileType["MP4"] = 18] = "MP4";
    FileType[FileType["MOV"] = 19] = "MOV";
    FileType[FileType["AVI"] = 20] = "AVI";
    FileType[FileType["MKV"] = 21] = "MKV";
})(FileType || (FileType = {}));
export const fileTypeMimeMap = [
    { type: FileType.TXT, mimeType: 'text/plain' },
    { type: FileType.PDF, mimeType: 'application/pdf' },
    { type: FileType.DOC, mimeType: 'application/msword' },
    { type: FileType.DOCX, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
    { type: FileType.XLS, mimeType: 'application/vnd.ms-excel' },
    { type: FileType.XLSX, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    { type: FileType.PPT, mimeType: 'application/vnd.ms-powerpoint' },
    { type: FileType.PPTX, mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
    { type: FileType.JPG, mimeType: 'image/jpeg' },
    { type: FileType.JPEG, mimeType: 'image/jpeg' },
    { type: FileType.PNG, mimeType: 'image/png' },
    { type: FileType.WEBP, mimeType: 'image/webp' },
    { type: FileType.GIF, mimeType: 'image/gif' },
    { type: FileType.BMP, mimeType: 'image/bmp' },
    { type: FileType.TIFF, mimeType: 'image/tiff' },
    { type: FileType.MP3, mimeType: 'audio/mpeg' },
    { type: FileType.WAV, mimeType: 'audio/wav' },
    { type: FileType.MP4, mimeType: 'video/mp4' },
    { type: FileType.WEBM, mimeType: 'video/webm' },
    { type: FileType.MOV, mimeType: 'video/quicktime' },
    { type: FileType.AVI, mimeType: 'video/x-msvideo' },
    { type: FileType.MKV, mimeType: 'video/x-matroska' }
];
export function getMimeTypes(fileTypes) {
    return fileTypes
        .map(ft => fileTypeMimeMap.find(m => m.type === ft)?.mimeType)
        .filter((mt) => !!mt);
}
