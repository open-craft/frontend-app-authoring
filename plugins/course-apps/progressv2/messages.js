import { defineMessages } from '@edx/frontend-platform/i18n';

const messages = defineMessages({
  heading: {
    id: 'course-authoring.pages-resources.progress.heading',
    defaultMessage: 'Configure progress',
  },
  enableProgressLabel: {
    id: 'course-authoring.pages-resources.progress.enable-progress.label',
    defaultMessage: 'Progress',
  },
  enableProgressHelp: {
    id: 'course-authoring.pages-resources.progress.enable-progress.help',
    defaultMessage: `As students work through graded assignments, scores
        will appear under the progress tab. The progress tab contains a chart of
        all graded assignments in the course, with a list of all assignments and
        scores below.`,
  },
  enableProgressLink: {
    id: 'course-authoring.pages-resources.progress.enable-progress.link',
    defaultMessage: 'Learn more about progress',
  },
  enableGraphLabel: {
    id: 'course-authoring.pages-resources.progress.enable-graph.label',
    defaultMessage: 'Enable progress graph',
  },
  enableGraphHelp: {
    id: 'course-authoring.pages-resources.progress.enable-graph.help',
    defaultMessage: 'If enabled, students can view the progress graph',
  },
  showGradesLabel: {
    id: 'course-authoring.pages-resources.progress.show-grades.label',
    defaultMessage: 'Show grades',
  },
  showGradesHelp: {
    id: 'course-authoring.pages-resources.progress.show-grades.help',
    defaultMessage: 'If enabled, students can see their grades on the progress page.',
  },
  showGradeSummaryLabel: {
    id: 'course-authoring.pages-resources.progress.show-grade-summary.label',
    defaultMessage: 'Show grades Summary',
  },
  showGradeSummaryHelp: {
    id: 'course-authoring.pages-resources.progress.show-grade-summary.help',
    defaultMessage: 'If enabled, students can see a summary of their grades on the progress page.',
  },
  showRelatedLinksLabel: {
    id: 'course-authoring.pages-resources.progress.show-related-links.label',
    defaultMessage: 'Show Related Links',
  },
  showRelatedLinksHelp: {
    id: 'course-authoring.pages-resources.progress.show-related-links.help',
    defaultMessage: 'If enabled, students can see related links in the sidebar on the progress page.',
  },
});

export default messages;
