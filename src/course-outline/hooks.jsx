import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useToggle } from '@edx/paragon';

import { RequestStatus } from '../data/constants';
import {
  setCurrentItem,
  updateSavingStatus,
} from './data/slice';
import {
  getLoadingStatus,
  getOutlineIndexData,
  getSavingStatus,
  getStatusBarData,
  getSectionsList,
  getCurrentItem,
  getCurrentSection,
} from './data/selectors';
import {
  addNewCourseSectionQuery,
  deleteCourseItemQuery,
  editCourseItemQuery,
  duplicateCourseSectionQuery,
  enableCourseHighlightsEmailsQuery,
  fetchCourseBestPracticesQuery,
  fetchCourseLaunchQuery,
  fetchCourseOutlineIndexQuery,
  fetchCourseReindexQuery,
  publishCourseSectionQuery,
  updateCourseSectionHighlightsQuery,
  configureCourseSectionQuery,
} from './data/thunk';

const useCourseOutline = ({ courseId }) => {
  const dispatch = useDispatch();

  const { reindexLink, courseStructure, lmsLink } = useSelector(getOutlineIndexData);
  const { outlineIndexLoadingStatus, reIndexLoadingStatus } = useSelector(getLoadingStatus);
  const statusBarData = useSelector(getStatusBarData);
  const savingStatus = useSelector(getSavingStatus);
  const sectionsList = useSelector(getSectionsList);
  const currentItem = useSelector(getCurrentItem);
  const currentSection = useSelector(getCurrentSection);

  const [isEnableHighlightsModalOpen, openEnableHighlightsModal, closeEnableHighlightsModal] = useToggle(false);
  const [isSectionsExpanded, setSectionsExpanded] = useState(true);
  const [isDisabledReindexButton, setDisableReindexButton] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [isHighlightsModalOpen, openHighlightsModal, closeHighlightsModal] = useToggle(false);
  const [isPublishModalOpen, openPublishModal, closePublishModal] = useToggle(false);
  const [isConfigureModalOpen, openConfigureModal, closeConfigureModal] = useToggle(false);
  const [isDeleteModalOpen, openDeleteModal, closeDeleteModal] = useToggle(false);

  const handleNewSectionSubmit = () => {
    dispatch(addNewCourseSectionQuery(courseStructure.id));
  };

  const headerNavigationsActions = {
    handleNewSection: handleNewSectionSubmit,
    handleReIndex: () => {
      setDisableReindexButton(true);
      setShowSuccessAlert(false);
      setShowErrorAlert(false);

      dispatch(fetchCourseReindexQuery(courseId, reindexLink)).then(() => {
        setDisableReindexButton(false);
      });
    },
    handleExpandAll: () => {
      setSectionsExpanded((prevState) => !prevState);
    },
    lmsLink,
  };

  const handleEnableHighlightsSubmit = () => {
    dispatch(enableCourseHighlightsEmailsQuery(courseId));
    closeEnableHighlightsModal();
  };

  const handleInternetConnectionFailed = () => {
    dispatch(updateSavingStatus({ status: RequestStatus.FAILED }));
  };

  const handleOpenHighlightsModal = (section) => {
    dispatch(setCurrentItem(section));
    openHighlightsModal();
  };

  const handleHighlightsFormSubmit = (highlights) => {
    const dataToSend = Object.values(highlights).filter(Boolean);
    dispatch(updateCourseSectionHighlightsQuery(currentItem.id, dataToSend));

    closeHighlightsModal();
  };

  const handlePublishSectionSubmit = () => {
    dispatch(publishCourseSectionQuery(currentItem.id, currentSection.id));

    closePublishModal();
  };

  const handleConfigureSectionSubmit = (isVisibleToStaffOnly, startDatetime) => {
    dispatch(configureCourseSectionQuery(currentSection.id, isVisibleToStaffOnly, startDatetime));

    closeConfigureModal();
  };

  const handleEditSubmit = (itemId, sectionId, displayName) => {
    dispatch(editCourseItemQuery(itemId, sectionId, displayName));
  };

  const handleDeleteItemSubmit = () => {
    dispatch(deleteCourseItemQuery(currentItem.id, currentItem.category));
    closeDeleteModal();
  };

  const handleDuplicateSectionSubmit = () => {
    dispatch(duplicateCourseSectionQuery(currentItem.id, courseStructure.id));
  };

  useEffect(() => {
    dispatch(fetchCourseOutlineIndexQuery(courseId));
    dispatch(fetchCourseBestPracticesQuery({ courseId }));
    dispatch(fetchCourseLaunchQuery({ courseId }));
  }, [courseId]);

  useEffect(() => {
    if (reIndexLoadingStatus === RequestStatus.FAILED) {
      setShowErrorAlert(true);
    }

    if (reIndexLoadingStatus === RequestStatus.SUCCESSFUL) {
      setShowSuccessAlert(true);
    }
  }, [reIndexLoadingStatus]);

  return {
    savingStatus,
    sectionsList,
    isLoading: outlineIndexLoadingStatus === RequestStatus.IN_PROGRESS,
    isReIndexShow: Boolean(reindexLink),
    showSuccessAlert,
    showErrorAlert,
    isDisabledReindexButton,
    isSectionsExpanded,
    isPublishModalOpen,
    openPublishModal,
    closePublishModal,
    isConfigureModalOpen,
    openConfigureModal,
    closeConfigureModal,
    headerNavigationsActions,
    handleEnableHighlightsSubmit,
    handleHighlightsFormSubmit,
    handlePublishSectionSubmit,
    handleConfigureSectionSubmit,
    handleEditSubmit,
    statusBarData,
    isEnableHighlightsModalOpen,
    openEnableHighlightsModal,
    closeEnableHighlightsModal,
    isInternetConnectionAlertFailed: savingStatus === RequestStatus.FAILED,
    handleInternetConnectionFailed,
    handleOpenHighlightsModal,
    isHighlightsModalOpen,
    closeHighlightsModal,
    courseName: courseStructure?.displayName,
    isDeleteModalOpen,
    closeDeleteModal,
    openDeleteModal,
    handleDeleteItemSubmit,
    handleDuplicateSectionSubmit,
    handleNewSectionSubmit,
  };
};

// eslint-disable-next-line import/prefer-default-export
export { useCourseOutline };
