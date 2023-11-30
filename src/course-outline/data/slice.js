/* eslint-disable no-param-reassign */
import { createSlice } from '@reduxjs/toolkit';

import { COURSE_BLOCK_NAMES } from '../constants';
import { RequestStatus } from '../../data/constants';

const slice = createSlice({
  name: 'courseOutline',
  initialState: {
    loadingStatus: {
      outlineIndexLoadingStatus: RequestStatus.IN_PROGRESS,
      reIndexLoadingStatus: RequestStatus.IN_PROGRESS,
      fetchSectionLoadingStatus: RequestStatus.IN_PROGRESS,
    },
    outlineIndexData: {},
    savingStatus: '',
    statusBarData: {
      courseReleaseDate: '',
      highlightsEnabledForMessaging: false,
      isSelfPaced: false,
      checklist: {
        totalCourseLaunchChecks: 0,
        completedCourseLaunchChecks: 0,
        totalCourseBestPracticesChecks: 0,
        completedCourseBestPracticesChecks: 0,
      },
    },
    sectionsList: [],
    currentSection: {},
    currentSubsection: {},
    currentItem: {},
  },
  reducers: {
    fetchOutlineIndexSuccess: (state, { payload }) => {
      state.outlineIndexData = payload;
      state.sectionsList = payload.courseStructure?.childInfo?.children || [];
    },
    updateOutlineIndexLoadingStatus: (state, { payload }) => {
      state.loadingStatus = {
        ...state.loadingStatus,
        outlineIndexLoadingStatus: payload.status,
      };
    },
    updateReindexLoadingStatus: (state, { payload }) => {
      state.loadingStatus = {
        ...state.loadingStatus,
        reIndexLoadingStatus: payload.status,
      };
    },
    updateFetchSectionLoadingStatus: (state, { payload }) => {
      state.loadingStatus = {
        ...state.loadingStatus,
        fetchSectionLoadingStatus: payload.status,
      };
    },
    updateStatusBar: (state, { payload }) => {
      state.statusBarData = {
        ...state.statusBarData,
        ...payload,
      };
    },
    fetchStatusBarChecklistSuccess: (state, { payload }) => {
      state.statusBarData.checklist = {
        ...state.statusBarData.checklist,
        ...payload,
      };
    },
    fetchStatusBarSelPacedSuccess: (state, { payload }) => {
      state.statusBarData.isSelfPaced = payload.isSelfPaced;
    },
    updateSavingStatus: (state, { payload }) => {
      state.savingStatus = payload.status;
    },
    updateSectionList: (state, { payload }) => {
      state.sectionsList = state.sectionsList.map((section) => (section.id === payload.id ? payload : section));
    },
    setCurrentItem: (state, { payload }) => {
      state.currentItem = payload;
    },
    setCurrentSection: (state, { payload }) => {
      state.currentSection = payload;
    },
    setCurrentSubsection: (state, { payload }) => {
      state.currentSubsection = payload;
    },
    addSection: (state, { payload }) => {
      state.sectionsList = [
        ...state.sectionsList,
        payload,
      ];
    },
    deleteItem: (state, { payload }) => {
      switch (payload.category) {
        case COURSE_BLOCK_NAMES.chapter.id:
          state.sectionsList = state.sectionsList.filter(
            ({ id }) => id !== payload.itemId
          );
          break;
        case COURSE_BLOCK_NAMES.sequential.id:
          state.sectionsList = state.sectionsList.map((section) => {
            section.childInfo.children = section.childInfo.children.filter(
              ({ id }) => id !== payload.itemId
            );
            return section;
          });
        case COURSE_BLOCK_NAMES.vertical.id:
          state.sectionsList = state.sectionsList.map((section) => {
            section.childInfo.children = section.childInfo.children.map(
              (subsection) => {
                subsection.childInfo.children = subsection.childInfo.children.filter(
                  ({ id }) => id !== payload.itemId
                );
                return subsection;
              }
            );
            return section;
          });
        default:
          break;
      }
    },
    duplicateSection: (state, { payload }) => {
      state.sectionsList = state.sectionsList.reduce((result, currentValue) => {
        if (currentValue.id === payload.id) {
          return [...result, currentValue, payload.duplicatedSection];
        }
        return [...result, currentValue];
      }, []);
    },
  },
});

export const {
  addSection,
  fetchOutlineIndexSuccess,
  updateOutlineIndexLoadingStatus,
  updateReindexLoadingStatus,
  updateStatusBar,
  fetchStatusBarChecklistSuccess,
  fetchStatusBarSelPacedSuccess,
  updateFetchSectionLoadingStatus,
  updateSavingStatus,
  updateSectionList,
  setCurrentItem,
  setCurrentSection,
  setCurrentSubsection,
  deleteItem,
  duplicateSection,
} = slice.actions;

export const {
  reducer,
} = slice;
