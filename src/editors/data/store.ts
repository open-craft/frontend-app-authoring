import * as redux from 'redux';
import type { AxiosResponse } from 'axios';
import thunkMiddleware from 'redux-thunk';
import { composeWithDevToolsLogOnlyInProduction } from '@redux-devtools/extension';
import { createLogger } from 'redux-logger';
import type { RequestKeys, RequestStates } from './constants/requests';

import reducer, { actions, selectors } from './redux';
import { AdvancedProblemType, ProblemType } from './constants/problem';

interface EditorState {
  // TODO: move all the 'app' state into EditorContext, not redux.
  // TODO: replace 'requests' state with React Query hooks
  // TODO: instead of one big store, give each editor its own store just for that editor type (e.g. VideoStore)
  app: {
    blockId: string; // e.g. "block-v1:Org+TS100+24+type@html+block@12345"
    blockTitle: string; // e.g. "A Text Component";
    blockType: string;
    blockValue: {
      data: {
        id: string; // e.g. "block-v1:Org+TS100+24+type@html+block@12345"
        display_name: string; // e.g. "A Text Component"
        category?: string; // e.g. "html". Only for blocks from courses
        data: string | Record<string, any>;
        metadata: Record<string, any>;
        [otherKey: string]: any;
      },
      status: number; // e.g. 200
      // There are other fields; this is an AxiosResponse object. But we don't want to rely on those details.
    },
    unitUrl: {
      data: {
        ancestors: {
          id: string;
          display_name: string;
          category: 'vertical' | 'sequential' | 'chapter' | 'course';
          has_children: boolean;
          unit_level_discussions?: boolean;
        }[];
      },
      status: number; // e.g. 200
      // There are other fields; this is an AxiosResponse object. But we don't want to rely on those details.
    },
    blockContent: null;
    studioView: null;
    saveResponse: null;
    /** @deprecated Get as `const { learningContextid } = useEditorContext()` instead */
    learningContextId: string; // e.g. "course-v1:Org+TS100+24";
    editorInitialized: boolean;
    studioEndpointUrl: string; // e.g. "http://studio.local.openedx.io:8001" TODO: move to EditorContext
    lmsEndpointUrl: string; // e.g. "http://local.openedx.io:8000" TODO: move to EditorContext
    images: Record<string, {
      id: string;
      displayName: string; // e.g. "nHLVaDX6mro-unsplash.jpg"
      contentType: string; // e.g. "image/jpeg"
      dateAdded: number; // e.g. 1694629800000,
      /** e.g. "/asset-v1:Org+TS100+24+type@asset+block@jaromir-kavan-nHLVaDX6mro-unsplash.jpg" */
      url: string;
      /** e.g. "http://local.openedx.io:8000/asset-v1:Org+TS100+24+type@asset+block@blah.jpg" */
      externalUrl: string;
      /** e.g. "/static/jaromir-kavan-nHLVaDX6mro-unsplash.jpg" */
      portableUrl: string;
      /** e.g. e.g. "/asset-v1:Org+TS100+24+type@thumbnail+block@jaromir-kavan-nHLVaDX6mro-unsplash.jpg" */
      thumbnail: string;
      locked: boolean;
      staticFullUrl: string;
      fileSize: number;
      usageLocations: { displayLocation: string; url: string; }[];
    }>;
    imageCount: number;
    videos: Record<string, any>;
    courseDetails: Record<string, any>;
    showRawEditor: boolean;
  },
  requests: Record<keyof typeof RequestKeys, {
    status: keyof typeof RequestStates;
    response: AxiosResponse;
  }>
  video: {
    videoSource: string; // default: ""
    videoId: string; // default: ""
    fallbackVideos: string[];
    allowVideoDownloads: boolean;
    allowVideoSharing: { level: string; value: boolean };
    videoSharingEnabledForAll: boolean;
    videoSharingEnabledForCourse: boolean;
    videoSharingLearnMoreLink: string;
    thumbnail: null | any;
    transcripts: any[];
    selectedVideoTranscriptUrls: Record<string, any>;
    allowTranscriptDownloads: boolean;
    duration: {
      /** e.g. "00:00:00" */
      startTime: string;
      stopTime: string;
      total: string;
    },
    showTranscriptByDefault: boolean;
    handout: null,
    licenseType: null,
    licenseDetails: {
      attribution: boolean;
      noncommercial: boolean;
      noDerivatives: boolean;
      shareAlike: boolean;
    },
    courseLicenseType: string | null;
    courseLicenseDetails: {
      attribution: boolean;
      noncommercial: boolean;
      noDerivatives: boolean;
      shareAlike: boolean;
    },
    allowThumbnailUpload: boolean | null; // TODO: why is this null?
    allowTranscriptImport: boolean;
  },
  problem: {
    rawOLX: string;
    problemType: null | ProblemType | AdvancedProblemType;
    question: string;
    answers: any[];
    correctAnswerCount: number;
    groupFeedbackList: any[];
    generalFeedback: string;
    additionalAttributes: Record<string, any>;
    defaultSettings: Record<string, any>;
    settings: {
      randomization: null | any; // Not sure what type this field has
      scoring: {
        weight: number;
        attempts: { unlimited: boolean; number: number | null; }
      },
      hints: any[];
      timeBetween: number;
      showAnswer: {
        on: string;
        afterAttempts: number;
      },
      showResetButton: boolean | null;
      solutionExplanation: string;
      tolerance: {
        value: number | null;
        type: 'Percent' | 'Number' | 'None';
      }
    }
  },
  game: {
    settings: Record<string, any>;
    exampleValue: 'this is an example value from the redux state';
  }
}

export const createStore = () => {
  const loggerMiddleware = createLogger();

  const middleware = [thunkMiddleware, loggerMiddleware];

  const store = redux.createStore<EditorState, any, any, any>(
    reducer as any,
    composeWithDevToolsLogOnlyInProduction(redux.applyMiddleware(...middleware)),
  );

  /**
   * Dev tools for redux work
   */
  if (process.env.NODE_ENV === 'development') {
    (window as any).store = store;
    (window as any).actions = actions;
    (window as any).selectors = selectors;
  }

  return store;
};

const store = createStore();

export default store;
