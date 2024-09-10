import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

import { RequestStatus } from '../data/constants';
import { COURSE_CREATOR_STATES } from '../constants';
import { getCourseData, getSavingStatus } from '../generic/data/selectors';
import { fetchStudioHomeData } from './data/thunks';
import {
  getLoadingStatuses,
  getSavingStatuses,
  getStudioHomeData,
  getStudioHomeCoursesParams,
} from './data/selectors';
import { updateSavingStatuses } from './data/slice';

const useStudioHome = (isPaginated = false) => {
  const location = useLocation();
  const dispatch = useDispatch();
  const studioHomeData = useSelector(getStudioHomeData);
  const studioHomeCoursesParams = useSelector(getStudioHomeCoursesParams);
  const { isFiltered } = studioHomeCoursesParams;
  const newCourseData = useSelector(getCourseData);
  const { studioHomeLoadingStatus } = useSelector(getLoadingStatuses);
  const savingCreateRerunStatus = useSelector(getSavingStatus);
  const {
    courseCreatorSavingStatus,
    deleteNotificationSavingStatus,
  } = useSelector(getSavingStatuses);
  const [showNewCourseContainer, setShowNewCourseContainer] = useState(false);
  const isLoadingPage = studioHomeLoadingStatus === RequestStatus.IN_PROGRESS;
  const isFailedLoadingPage = studioHomeLoadingStatus === RequestStatus.FAILED;

  useEffect(() => {
    if (!isPaginated) {
      dispatch(fetchStudioHomeData(location.search ?? '', false, { active_only: true }));
      setShowNewCourseContainer(false);
    }
  }, [location.search]);

  useEffect(() => {
    if (isPaginated) {
      const firstPage = 1;
      dispatch(fetchStudioHomeData(location.search ?? '', false, { page: firstPage, active_only: true }, true));
    }
  }, []);

  useEffect(() => {
    if (courseCreatorSavingStatus === RequestStatus.SUCCESSFUL) {
      dispatch(updateSavingStatuses({ courseCreatorSavingStatus: '' }));
      dispatch(fetchStudioHomeData('', false, { active_only: true }));
    }
  }, [courseCreatorSavingStatus]);

  useEffect(() => {
    if (deleteNotificationSavingStatus === RequestStatus.SUCCESSFUL) {
      dispatch(updateSavingStatuses({ courseCreatorSavingStatus: '' }));
      dispatch(fetchStudioHomeData('', false, { active_only: true }));
    } else if (deleteNotificationSavingStatus === RequestStatus.FAILED) {
      dispatch(updateSavingStatuses({ deleteNotificationSavingStatus: '' }));
    }
  }, [deleteNotificationSavingStatus]);

  const {
    allowCourseReruns,
    rerunCreatorStatus,
    optimizationEnabled,
    studioRequestEmail,
    inProcessCourseActions,
    courseCreatorStatus,
  } = studioHomeData;

  const isShowOrganizationDropdown = optimizationEnabled && courseCreatorStatus === COURSE_CREATOR_STATES.granted;
  const isShowEmailStaff = courseCreatorStatus === COURSE_CREATOR_STATES.disallowedForThisSite && !!studioRequestEmail;
  const isShowProcessing = allowCourseReruns && rerunCreatorStatus && inProcessCourseActions?.length > 0;
  const hasAbilityToCreateNewCourse = courseCreatorStatus === COURSE_CREATOR_STATES.granted;
  const anyQueryIsPending = [deleteNotificationSavingStatus, courseCreatorSavingStatus, savingCreateRerunStatus]
    .includes(RequestStatus.PENDING);
  const anyQueryIsFailed = [deleteNotificationSavingStatus, courseCreatorSavingStatus, savingCreateRerunStatus]
    .includes(RequestStatus.FAILED);

  return {
    isLoadingPage,
    isFailedLoadingPage,
    newCourseData,
    studioHomeData,
    isShowProcessing,
    anyQueryIsFailed,
    isShowEmailStaff,
    anyQueryIsPending,
    showNewCourseContainer,
    courseCreatorSavingStatus,
    isShowOrganizationDropdown,
    hasAbilityToCreateNewCourse,
    isFiltered,
    dispatch,
    setShowNewCourseContainer,
  };
};

// eslint-disable-next-line import/prefer-default-export
export { useStudioHome };
