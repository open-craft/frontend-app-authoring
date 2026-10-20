import { defineMessages } from '@edx/frontend-platform/i18n';

const messages = defineMessages({
  loadingSpinner: {
    id: 'GameEditor.loadingSpinner',
    defaultMessage: 'Loading Spinner',
    description: 'Loading message for spinner screenreader text.',
  },
  descriptionHeaderFlashcard: {
    id: 'GameEditor.DescriptionHeaderFlashcard',
    defaultMessage: 'Flashcard terms',
    description: 'Flashcard Description Header',
  },
  descriptionHeaderMatching: {
    id: 'GameEditor.DescriptionHeaderMatching',
    defaultMessage: 'Matching terms',
    description: 'Matching Description Header',
  },
  descriptionFlashcard: {
    id: 'GameEditor.DescriptionFlashcard',
    defaultMessage: 'Enter your terms and definitions below. Learners will review each card by viewing the term, then flipping to reveal the definition.',
    description: 'Flashcard Description',
  },
  descriptionMatching: {
    id: 'GameEditor.DescriptionMatching',
    defaultMessage: 'Enter your terms and definitions below. Learners must match each term with the correct definition.',
    description: 'Matching Description',
  },
  timerSettingsDescription: {
    id: 'GameEditor.TimerSettingsDescription',
    defaultMessage: 'Measure the time it takes learners to match all terms and definitions. Used to calculate a learner\'s score.',
    description: 'Timer Settings Option Description',
  },
  enterYourTerm: {
    id: 'GameEditor.enterYourTerm',
    defaultMessage: 'Enter your term',
    description: 'Placeholder text for entering a term in the game editor.',
  },
  enterYourDefinition: {
    id: 'GameEditor.enterYourDefinition',
    defaultMessage: 'Enter your definition',
    description: 'Placeholder text for entering a definition in the game editor.',
  },
  shuffleSettingsDescription: {
    id: 'GameEditor.shuffleSettingsDescription',
    defaultMessage: 'Shuffle the order of terms shown to learners when reviewing.',
    description: 'Shuffle Settings Description',
  },
  termLabel: {
    id: 'GameEditor.termLabel',
    defaultMessage: 'Term',
    description: 'Label for term input field',
  },
  deckCardCount: {
    id: 'GameEditor.deckCardCount',
    defaultMessage: '{cardCount, plural, =0 {No cards} one {1 card} other {# cards}}',
    description: 'Number of cards in a deck, shown beside the deck name in the deck settings.',
  },
  deckListLabel: {
    id: 'GameEditor.deckListLabel',
    defaultMessage: 'Decks',
    description: 'Accessible name for the list of decks in the deck settings panel.',
  },
  deckNameDuplicate: {
    id: 'GameEditor.deckNameDuplicate',
    defaultMessage: 'Deck names must be unique',
    description: 'Error shown when two decks have the same name, ignoring case.',
  },
  deckNameErrorAlert: {
    id: 'GameEditor.deckNameErrorAlert',
    defaultMessage: 'Review the deck names in Settings. Every deck needs a name and no two decks can share one.',
    description: 'Alert shown when a save is blocked because a deck name is missing or duplicated.',
  },
  deckNameErrorHeading: {
    id: 'GameEditor.deckNameErrorHeading',
    defaultMessage: 'Deck names need fixing',
    description: 'Heading of the alert shown when a save is blocked by a deck name.',
  },
  deckNameInputLabel: {
    id: 'GameEditor.deckNameInputLabel',
    defaultMessage: 'Deck {number} name',
    description: 'Accessible label for the name field of the deck at this position.',
  },
  deckNameRequired: {
    id: 'GameEditor.deckNameRequired',
    defaultMessage: 'Enter a deck name',
    description: 'Error shown when a deck name is left empty.',
  },
  deckPickerLabel: {
    id: 'GameEditor.deckPickerLabel',
    defaultMessage: 'Deck',
    description: 'Label beside the deck selector above the card list.',
  },
  deckPickerToggleLabel: {
    id: 'GameEditor.deckPickerToggleLabel',
    defaultMessage: '{deckName}, change deck',
    description: 'Accessible name for the deck selector button, which shows the active deck name.',
  },
  definitionLabel: {
    id: 'GameEditor.definitionLabel',
    defaultMessage: 'Definition',
    description: 'Label for definition input field',
  },
  termValidationError: {
    id: 'GameEditor.termValidationError',
    defaultMessage: 'Enter a term',
    description: 'Error message when term field is empty but definition is filled',
  },
  definitionValidationError: {
    id: 'GameEditor.definitionValidationError',
    defaultMessage: 'Enter a definition',
    description: 'Error message when definition field is empty but term is filled',
  },
  imageWithoutTextError: {
    id: 'GameEditor.imageWithoutTextError',
    defaultMessage: 'Text is required for flashcard images.',
    description: 'Error message when a flashcard has an image but no text',
  },
  selectDeckLabel: {
    id: 'GameEditor.selectDeckLabel',
    defaultMessage: 'Make {deckName} the active deck',
    description: 'Accessible label for the radio button that selects which deck is being edited.',
  },
  settingsTitle: {
    id: 'GameEditor.settingsTitle',
    defaultMessage: 'Settings',
    description: 'Title for the settings sidebar in the game editor.',
  },
  validationErrorHeading: {
    id: 'GameEditor.validationErrorHeading',
    defaultMessage: 'We couldn\'t save your changes.',
    description: 'Heading for validation errors alert in the game editor.',
  },
  validationErrorAlert: {
    id: 'GameEditor.validationErrorAlert',
    defaultMessage: 'Please check your entries and try again.',
    description: 'Alert message for validation errors in the game editor.',
  },
  noTextLabel: {
    id: 'GameEditor.noTextLabel',
    defaultMessage: 'No text',
    description: 'Label shown when a card has no text content.',
  },
  newDeckLabel: {
    id: 'GameEditor.newDeckLabel',
    defaultMessage: 'New deck',
    description: 'Action that adds an empty deck to the game.',
  },
  noImageLabel: {
    id: 'GameEditor.noImageLabel',
    defaultMessage: 'No image',
    description: 'Label shown when a card has no image content.',
  },
  cardActionsLabel: {
    id: 'GameEditor.cardActionsLabel',
    defaultMessage: 'Card actions',
    description: 'Accessible label for the menu button on each card that offers move up, move down and delete.',
  },
  moveUpLabel: {
    id: 'GameEditor.moveUpLabel',
    defaultMessage: 'Move up',
    description: 'Label for move up dropdown item.',
  },
  moveDownLabel: {
    id: 'GameEditor.moveDownLabel',
    defaultMessage: 'Move down',
    description: 'Label for move down dropdown item.',
  },
  moveToDeckOption: {
    id: 'GameEditor.moveToDeckOption',
    defaultMessage: 'Move to {deckName}',
    description: 'Card menu action that moves this card to another deck.',
  },
  deleteDeckConfirmBody: {
    id: 'GameEditor.deleteDeckConfirmBody',
    defaultMessage: '{deckName} has {cardCount, plural, one {1 card} other {# cards}}. Deleting the deck also deletes its cards.',
    description: 'Body of the dialog that asks before deleting a deck that still has cards.',
  },
  deleteDeckConfirmButton: {
    id: 'GameEditor.deleteDeckConfirmButton',
    defaultMessage: 'Delete deck',
    description: 'Button that confirms deleting a deck and its cards.',
  },
  deleteDeckConfirmTitle: {
    id: 'GameEditor.deleteDeckConfirmTitle',
    defaultMessage: 'Delete deck?',
    description: 'Title of the dialog that asks before deleting a deck that still has cards.',
  },
  deleteDeckLabel: {
    id: 'GameEditor.deleteDeckLabel',
    defaultMessage: 'Delete {deckName}',
    description: 'Accessible label for the button that deletes one deck.',
  },
  deleteLabel: {
    id: 'GameEditor.deleteLabel',
    defaultMessage: 'Delete',
    description: 'Label for delete dropdown item.',
  },
  addLabel: {
    id: 'GameEditor.addLabel',
    defaultMessage: 'Add',
    description: 'Label for add button.',
  },
  typeLabel: {
    id: 'GameEditor.typeLabel',
    defaultMessage: 'Type',
    description: 'Label for type setting.',
  },
  flashcardsLabel: {
    id: 'GameEditor.flashcardsLabel',
    defaultMessage: 'Flashcards',
    description: 'Label for flashcards game type.',
  },
  matchingLabel: {
    id: 'GameEditor.matchingLabel',
    defaultMessage: 'Matching',
    description: 'Label for matching game type.',
  },
  shuffleLabel: {
    id: 'GameEditor.shuffleLabel',
    defaultMessage: 'Shuffle',
    description: 'Label for shuffle setting.',
  },
  timerLabel: {
    id: 'GameEditor.timerLabel',
    defaultMessage: 'Timer',
    description: 'Label for timer setting.',
  },
  offLabel: {
    id: 'GameEditor.offLabel',
    defaultMessage: 'Off',
    description: 'Label for off toggle button.',
  },
  onLabel: {
    id: 'GameEditor.onLabel',
    defaultMessage: 'On',
    description: 'Label for on toggle button.',
  },
  imageSettingsTooltip: {
    id: 'GameEditor.imageSettingsTooltip',
    defaultMessage: 'Image settings',
    description: 'Tooltip for image settings button.',
  },
  imageSettingsTitle: {
    id: 'GameEditor.imageSettingsTitle',
    defaultMessage: 'Image Settings',
    description: 'Title for image settings modal.',
  },
  saveButtonLabel: {
    id: 'GameEditor.saveButtonLabel',
    defaultMessage: 'Save',
    description: 'Label for save button in image settings modal.',
  },
  altTextLabel: {
    id: 'GameEditor.altTextLabel',
    defaultMessage: 'Alt text',
    description: 'Label for the image alt-text field.',
  },
  altTextError: {
    id: 'GameEditor.altTextError',
    defaultMessage: 'Alt text is required.',
    description: 'Error shown in the image settings dialog when the author tries to save an image with no alt text.',
  },
  loadErrorHeading: {
    id: 'GameEditor.loadErrorHeading',
    defaultMessage: 'The game settings could not be loaded.',
    description: 'Heading shown when fetching the block settings fails.',
  },
  retryButton: {
    id: 'GameEditor.retryButton',
    defaultMessage: 'Try again',
    description: 'Button that retries loading the block settings.',
  },
  addImageLabel: {
    id: 'GameEditor.addImageLabel',
    defaultMessage: 'Add image',
    description: 'Accessible label for the button that opens the file picker to add an image to a card side.',
  },
  removeImageLabel: {
    id: 'GameEditor.removeImageLabel',
    defaultMessage: 'Remove image',
    description: 'Accessible label for the button that removes the image from a card side.',
  },
  expandCardLabel: {
    id: 'GameEditor.expandCardLabel',
    defaultMessage: 'Expand card',
    description: 'Accessible label for the button that expands a collapsed card.',
  },
  collapseCardLabel: {
    id: 'GameEditor.collapseCardLabel',
    defaultMessage: 'Collapse card',
    description: 'Accessible label for the button that collapses an expanded card.',
  },
  requestErrorHeading: {
    id: 'GameEditor.requestErrorHeading',
    defaultMessage: 'The last image change could not be saved.',
    description: 'Heading shown when an image upload or removal fails.',
  },
  saveErrorHeading: {
    id: 'GameEditor.saveErrorHeading',
    defaultMessage: 'The game could not be saved.',
    description: 'Heading shown when the save request fails.',
  },
});

export default messages;
