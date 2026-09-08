/* eslint-disable no-param-reassign */
import saveAs from 'file-saver';
import { camelCaseObject, ensureConfig, getConfig } from '@edx/frontend-platform';
import { getAuthenticatedHttpClient, getHttpClient } from '@edx/frontend-platform/auth';
import { isEmpty } from 'lodash';
import type { AxiosProgressEvent, AxiosResponse } from 'axios';

export interface RawVideo {
  edxVideoId: string;
  clientVideoId: string;
  created: string | number | Date;
  courseVideoImageUrl?: string | null;
  transcripts?: string[];
  [key: string]: unknown;
}

export interface Video extends Partial<RawVideo> {
  id: string;
  displayName: string;
  wrapperType?: string;
  dateAdded?: string;
  usageLocations?: unknown[] | null;
  thumbnail?: string | null;
  transcriptStatus?: string;
  activeStatus?: string;
}

export interface VideoPageSettings {
  previousUploads?: RawVideo[];
  transcriptCredentials?: Record<string, boolean>;
  activeTranscriptPreferences?: TranscriptPreferences | null;
  [key: string]: unknown;
}

export interface TranscriptionPlan {
  turnaround?: Record<string, string>;
  fidelity?: Record<string, { display_name: string; languages?: Record<string, string>; }>;
  languages?: Record<string, string>;
  translations?: Record<string, string[]>;
}

export type TranscriptionPlans = Record<string, TranscriptionPlan>;

export interface TranscriptPreferences {
  cielo24Fidelity?: string;
  cielo24Turnaround?: string;
  global?: boolean;
  preferredLanguages?: string[];
  provider?: string;
  threePlayTurnaround?: string;
  videoSourceLanguage?: string;
  modified?: Date;
  [key: string]: unknown;
}

export interface TranscriptCredentials {
  apiKey?: string;
  apiSecretKey?: string;
  global?: boolean;
  provider?: string;
  username?: string;
  [key: string]: unknown;
}

export interface UploadData {
  name?: string;
  status?: string;
  progress?: string | number;
}

export interface UploadingIdsRef {
  current: {
    uploadData: Record<string, UploadData>;
    uploadCount?: number;
  };
}

export interface ApiResponse<T = unknown> {
  status: number;
  data?: T;
  [key: string]: unknown;
}

export interface DownloadRow {
  original?: {
    displayName?: string;
    downloadLink?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

ensureConfig([
  'STUDIO_BASE_URL',
], 'Course Apps API service');

export const getApiBaseUrl = (): string => getConfig().STUDIO_BASE_URL;
export const getVideosUrl = (courseId: string): string => `${getApiBaseUrl()}/api/contentstore/v1/videos/${courseId}`;
export const getCourseVideosApiUrl = (courseId: string): string => `${getApiBaseUrl()}/videos/${courseId}`;

/**
 * Fetches the course custom pages for provided course
 * @param {string} courseId
 * @returns {Promise<Record<string, any>>}
 */
export async function getVideos(courseId: string): Promise<VideoPageSettings & { previousUploads: RawVideo[]; }> {
  const { data } = await getAuthenticatedHttpClient()
    .get(getVideosUrl(courseId));
  const { video_transcript_settings: videoTranscriptSettings } = data;
  const { transcription_plans: transcriptionPlans } = videoTranscriptSettings;
  return {
    ...camelCaseObject(data),
    videoTranscriptSettings: {
      ...camelCaseObject(videoTranscriptSettings),
      transcriptionPlans,
    },
  };
}

export async function getAllUsagePaths(
  { courseId, videoIds }: { courseId: string; videoIds: string[]; },
): Promise<Array<{ id: string; usageLocations: unknown[]; activeStatus: string; }>> {
  // Hack: pass 'videoId' into the 'config' object; it will be ignored by axios
  // but allows us to read it out later to easily get the videoId per result.
  const apiPromises = videoIds.map(id =>
    getAuthenticatedHttpClient()
      .get(`${getVideosUrl(courseId)}/${id}/usage`, { videoId: id })
  );
  const updatedUsageLocations: Array<{ id: string; usageLocations: unknown[]; activeStatus: string; }> = [];
  const results = await Promise.allSettled(apiPromises);

  results.forEach(result => {
    const value = camelCaseObject((result as PromiseFulfilledResult<AxiosResponse>).value);
    if (value) {
      const { usageLocations } = value.data;
      const activeStatus = usageLocations?.length > 0 ? 'active' : 'inactive';
      const { videoId } = value.config;
      updatedUsageLocations.push({ id: videoId, usageLocations, activeStatus });
    }
  });
  return updatedUsageLocations;
}

/**
 * Fetches the course custom pages for provided course
 * @param {string} courseId
 * @returns {Promise<[{}]>}
 */
export async function fetchVideoList(courseId: string): Promise<{ videos: RawVideo[]; [key: string]: unknown; }> {
  const { data } = await getAuthenticatedHttpClient()
    .get(getCourseVideosApiUrl(courseId));
  return camelCaseObject(data);
}

export async function deleteTranscript(
  { videoId, language, apiUrl }: { videoId: string; language: string; apiUrl: string; },
): Promise<void> {
  await getAuthenticatedHttpClient()
    .delete(`${getApiBaseUrl()}${apiUrl}/${videoId}/${language}`);
}

export async function downloadTranscript({
  videoId,
  language,
  apiUrl,
  filename,
}: { videoId: string; language: string; apiUrl: string; filename: string; }): Promise<void> {
  const { data } = await getAuthenticatedHttpClient()
    .get(`${getApiBaseUrl()}${apiUrl}?edx_video_id=${videoId}&language_code=${language}`);
  const file = new Blob([data], { type: 'text/plain;charset=utf-8' });
  saveAs(file, filename);
}

export async function uploadTranscript({
  videoId,
  newLanguage,
  apiUrl,
  file,
  language,
}: { videoId: string; newLanguage: string; apiUrl: string; file: File; language: string; }): Promise<void> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('edx_video_id', videoId);
  formData.append('language_code', language);
  formData.append('new_language_code', newLanguage);
  await getAuthenticatedHttpClient().post(`${getApiBaseUrl()}${apiUrl}`, formData);
}

export async function getDownload(selectedRows: DownloadRow[] | null | undefined, courseId: string): Promise<string[]> {
  const downloadErrors: string[] = [];
  let file;
  let filename;
  if (selectedRows && selectedRows.length > 1) {
    const downloadLinks = selectedRows.map(row => {
      const video = row.original as NonNullable<DownloadRow['original']>;
      try {
        const url = video.downloadLink;
        const name = video.displayName;
        return { url, name };
      } catch {
        downloadErrors.push(`Cannot find download file for ${video?.displayName || 'video'}.`);
        return null;
      }
    });
    if (!isEmpty(downloadLinks)) {
      const json = { files: downloadLinks };
      const { data } = await getAuthenticatedHttpClient()
        .put(`${getVideosUrl(courseId)}/download`, json, { responseType: 'arraybuffer' });

      const date = new Date().toString();
      filename = `${courseId}-videos-${date}`;
      file = new Blob([data], { type: 'application/zip' });
      saveAs(file, filename);
    }
  } else if (selectedRows && selectedRows.length === 1) {
    try {
      const video = selectedRows[0].original as NonNullable<DownloadRow['original']>;
      const { downloadLink } = video;
      if (!isEmpty(downloadLink)) {
        saveAs(downloadLink, video.displayName);
      } else {
        downloadErrors.push(`Cannot find download file for ${video?.displayName}.`);
      }
    } catch {
      downloadErrors.push('Failed to download video.');
    }
  } else {
    downloadErrors.push('No files were selected to download.');
  }

  return downloadErrors;
}

/**
 * Fetch where a video is used in a course.
 * @param {blockId} courseId Course ID for the course to operate on
 */
export async function getVideoUsagePaths(
  { courseId, videoId }: { courseId: string; videoId: string; },
): Promise<{ usageLocations: unknown[]; }> {
  const { data } = await getAuthenticatedHttpClient()
    .get(`${getVideosUrl(courseId)}/${videoId}/usage`);
  return camelCaseObject(data);
}

/**
 * Delete video from course.
 * @param {blockId} courseId Course ID for the course to operate on
 */
export async function deleteVideo(courseId: string, videoId: string): Promise<void> {
  await getAuthenticatedHttpClient()
    .delete(`${getCourseVideosApiUrl(courseId)}/${videoId}`);
}

/**
 * Add thumbnail to video.
 * @param {blockId} courseId Course ID for the course to operate on
 */
export async function addThumbnail(
  { courseId, videoId, file }: { courseId: string; videoId: string; file: File; },
): Promise<{ imageUrl: string; }> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await getAuthenticatedHttpClient()
    .post(`${getApiBaseUrl()}/video_images/${courseId}/${videoId}`, formData);
  return camelCaseObject(data);
}

/**
 * Add video to course.
 * @param {blockId} courseId Course ID for the course to operate on
 */
export async function addVideo(
  courseId: string,
  file: File,
  controller?: AbortController,
): Promise<ApiResponse<{ files: Array<{ uploadUrl: string; edxVideoId: string; }>; }>> {
  const postJson = {
    files: [{ file_name: file.name, content_type: file.type }],
  };
  return getAuthenticatedHttpClient().post(
    getCourseVideosApiUrl(courseId),
    postJson,
    { signal: controller?.signal },
  );
}

export async function sendVideoUploadStatus(
  courseId: string,
  edxVideoId: string,
  message: string,
  status: string,
): Promise<ApiResponse> {
  return getAuthenticatedHttpClient()
    .post(getCourseVideosApiUrl(courseId), [{
      edxVideoId,
      message,
      status,
    }]);
}

export async function uploadVideo(
  uploadUrl: string,
  uploadFile: File,
  uploadingIdsRef: UploadingIdsRef,
  videoId: string,
  controller?: AbortController,
): Promise<ApiResponse> {
  const currentUpload = uploadingIdsRef.current.uploadData[videoId];
  return getHttpClient().put(uploadUrl, uploadFile, {
    headers: {
      'Content-Disposition': `attachment; filename="${uploadFile.name}"`,
      'Content-Type': uploadFile.type,
    },
    multipart: false,
    signal: controller?.signal,
    onUploadProgress: ({ loaded, total }: AxiosProgressEvent) => {
      const progress = ((loaded / (total as number)) * 100).toFixed(2);
      uploadingIdsRef.current.uploadData[videoId] = {
        ...currentUpload,
        progress,
      };
    },
  });
}

export async function deleteTranscriptPreferences(courseId: string): Promise<void> {
  await getAuthenticatedHttpClient().delete(`${getApiBaseUrl()}/transcript_preferences/${courseId}`);
}

export async function setTranscriptPreferences(
  courseId: string,
  preferences: TranscriptPreferences,
): Promise<TranscriptPreferences> {
  const {
    cielo24Fidelity,
    cielo24Turnaround,
    global,
    preferredLanguages,
    provider,
    threePlayTurnaround,
    videoSourceLanguage,
  } = preferences;
  const postJson = {
    cielo24_fidelity: cielo24Fidelity?.toUpperCase(),
    cielo24_turnaround: cielo24Turnaround,
    global,
    preferred_languages: preferredLanguages,
    provider,
    video_source_language: videoSourceLanguage,
    three_play_turnaround: threePlayTurnaround,
  };

  const { data } = await getAuthenticatedHttpClient()
    .post(`${getApiBaseUrl()}/transcript_preferences/${courseId}`, postJson);
  return camelCaseObject(data);
}

export async function setTranscriptCredentials(courseId: string, formFields: TranscriptCredentials): Promise<void> {
  const {
    apiKey,
    global,
    provider,
    ...otherFields
  } = formFields;
  const postJson: Record<string, unknown> = {
    api_key: apiKey,
    global,
    provider,
  };

  if (provider === '3PlayMedia') {
    const { apiSecretKey } = otherFields;
    postJson.api_secret_key = apiSecretKey;
  } else {
    const { username } = otherFields;
    postJson.username = username;
  }
  await getAuthenticatedHttpClient()
    .post(`${getApiBaseUrl()}/transcript_credentials/${courseId}`, postJson);
}
