/**
 * qa-mode.js
 * Q&A mode logic for the interactive question-and-answer sheet.
 *
 * Shows one question at a time with Previous/Next navigation buttons
 * (and keyboard arrow key support). Answers are preserved as the user
 * navigates between questions.
 *
 * The answer keys are Caesar-shifted (+1) and passed via the
 * `data-answer-keys` attribute on `.qa-container` so they don't appear
 * in plaintext in the DOM / view-source. They are only decoded inside
 * gradeSheet() when the "Submit & Grade" button is clicked.
 * This is the SAME obfuscation used in tracker-sheet.js.
 */
$(function () {
  const allowIncompleteSubmit = false; // Set to true to allow submission without answering all questions
  const shuffleQuestions = true; // Set to false to keep the original question and choice order
  const validationModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('qa-validation-modal'));
  const scoreModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('qa-score-modal'));
  const qaContainer = $('.qa-container');
  const encodedKeys = qaContainer.data('answer-keys') || '';

  // Session key for this sheet (per URL). sessionStorage survives page
  // refreshes but is cleared automatically when the tab/site is closed,
  // so a fresh shuffle + clean slate happens on each new visit.
  const sessionKey = 'qa-session-' + (window.location.pathname + window.location.search);

  // All question cards (rendered in the DOM, only one visible at a time)
  // `let` (not const) so we can re-query after shuffling the DOM order.
  let cards = $('.qa-card');
  const totalQuestions = cards.length;

  // Current question index (0-based)
  let currentIndex = 0;

  /**
   * Fisher-Yates (Knuth) in-place shuffle.
   * @param {Array} array - The array to shuffle in place.
   * @returns {Array} The same array, shuffled.
   */
  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /**
   * Shuffle the question order and the choice order within each
   * question. Grading stays correct because:
   *  - each card keeps its `data-question-index` (the original index
   *    used to look up the answer key), and
   *  - each shuffled choice label keeps its original radio `value`
   *    letter, so answer-key letters still match the correct choice.
   */
  function shuffleSheet() {
    // Shuffle question cards and re-append them in the new order.
    const shuffledCards = cards.toArray();
    shuffleArray(shuffledCards);
    const cardsContainer = qaContainer.find('.qa-cards');

    shuffledCards.forEach(function (cardEl, newIndex) {
      const $card = $(cardEl);
      // Renumber the visible badge + data-qnum to the new display order
      // (data-question-index is intentionally left untouched - it anchors grading).
      $card.attr('data-qnum', newIndex + 1);
      $card.find('.q-num').text(newIndex + 1);
      cardsContainer.append($card);
    });

    // Re-query cards so navigation/state/grading iterate in the new display order.
    cards = $('.qa-card');

    // Shuffle choice order within each question.
    cards.each(function () {
      const $card = $(this);
      const shuffledOptions = $card.find('.qa-option-label').toArray();
      shuffleArray(shuffledOptions);
      const optionsContainer = $card.find('.qa-options');

      shuffledOptions.forEach(function (optionEl) {
        optionsContainer.append(optionEl);
      });
    });

    // Persist the shuffled order for this browsing session.
    saveSession();
  }

  /**
   * Save the current question order, choice order, and selected answers
   * to sessionStorage so they survive page refreshes (but not closing
   * the site - sessionStorage is cleared automatically on tab close).
   */
  function saveSession() {
    const questionOrder = [];
    const optionOrder = [];
    const answers = [];

    cards.each(function () {
      const $card = $(this);
      questionOrder.push(Number($card.data('question-index')));

      const letters = [];
      $card.find('.qa-option-label').each(function () {
        letters.push($(this).find('input[type="radio"]').val());
      });
      optionOrder.push(letters);

      const checked = $card.find('input[type="radio"]:checked');
      answers.push(checked.length ? checked.val() : null);
    });

    try {
      sessionStorage.setItem(sessionKey, JSON.stringify({
        questionOrder: questionOrder,
        optionOrder: optionOrder,
        answers: answers
      }));
    } catch (e) {
      // Ignore storage failures (e.g. private browsing) - the sheet still
      // works, it just won't persist across refreshes.
    }
  }

  /**
   * Restore a previously saved session (order + answers), if one exists.
   * @returns {boolean} True if a saved session was restored.
   */
  function restoreSession() {
    let raw;
    try {
      raw = sessionStorage.getItem(sessionKey);
    } catch (e) {
      return false;
    }
    if (!raw) return false;

    let state;
    try {
      state = JSON.parse(raw);
    } catch (e) {
      return false;
    }

    if (!state || !Array.isArray(state.questionOrder) || !Array.isArray(state.optionOrder)) {
      return false;
    }

    const cardsContainer = qaContainer.find('.qa-cards');
    const cardsByIndex = {};
    cards.each(function () {
      cardsByIndex[Number($(this).data('question-index'))] = this;
    });

    // Reorder the cards to match the saved display order.
    state.questionOrder.forEach(function (origIndex, newIndex) {
      const cardEl = cardsByIndex[origIndex];
      if (!cardEl) return;
      const $card = $(cardEl);
      $card.attr('data-qnum', newIndex + 1);
      $card.find('.q-num').text(newIndex + 1);
      cardsContainer.append($card);
    });

    // Re-query cards so navigation/state/grading use the restored order.
    cards = $('.qa-card');

    // Restore the choice order within each card.
    cards.each(function (displayIndex) {
      const $card = $(this);
      const savedLetters = state.optionOrder[displayIndex];
      if (!Array.isArray(savedLetters)) return;

      const labelsByLetter = {};
      $card.find('.qa-option-label').each(function () {
        labelsByLetter[$(this).find('input[type="radio"]').val()] = this;
      });

      const optionsContainer = $card.find('.qa-options');
      savedLetters.forEach(function (letter) {
        if (labelsByLetter[letter]) {
          optionsContainer.append(labelsByLetter[letter]);
        }
      });
    });

    // Restore the selected answers.
    cards.each(function (displayIndex) {
      const savedAnswer = state.answers[displayIndex];
      if (!savedAnswer) return;
      $(this).find('input[type="radio"][value="' + savedAnswer + '"]').prop('checked', true);
    });

    return true;
  }

  /**
   * Show the question card at the given index and update the
   * navigation buttons / progress indicator accordingly.
   * @param {number} index - 0-based index of the question to show.
   */
  function showQuestion(index) {
    // Clamp index to valid range [0, totalQuestions - 1]
    currentIndex = Math.max(0, Math.min(index, totalQuestions - 1));

    // Toggle visibility of each card
    cards.each(function (i) {
      $(this).toggleClass('d-none', i !== currentIndex);
    });

    // Update progress indicator
    $('#qa-progress-label').text(`Question ${currentIndex + 1} of ${totalQuestions}`);
    $('#qa-counter').text(`${currentIndex + 1} / ${totalQuestions}`);

    // Disable Previous button at the first question (stop at the start)
    $('#qa-prev-btn').prop('disabled', currentIndex === 0);

    // Disable Next button at the last question (stop at the end)
    $('#qa-next-btn').prop('disabled', currentIndex === totalQuestions - 1);
  }

  /**
   * Toggle the "answers revealed" state on the container.
   * When revealed, correct answers are highlighted (same as tracker-sheet).
   * @param {boolean} revealed - Whether to show the correct answers.
   */
  function setAnswersRevealed(revealed) {
    qaContainer.toggleClass('answers-revealed', revealed);
  }

  /**
   * Update the "unanswered" visual state for all question cards.
   * Cards without a selected radio get the amber highlight.
   */
  function updateUnansweredState() {
    cards.each(function () {
      const card = $(this);
      const hasSelection = card.find('input[type="radio"]:checked').length > 0;
      card.toggleClass('unanswered', !hasSelection);
    });
  }

  // --- Event bindings ---

  // Radio change: update unanswered state and persist the selection
  cards.find('input[type="radio"]').on('change', function () {
    updateUnansweredState();
    saveSession();
  });

  // Previous button: go back one question (stops at the first)
  $('#qa-prev-btn').on('click', function () {
    showQuestion(currentIndex - 1);
  });

  // Next button: go forward one question (stops at the last)
  $('#qa-next-btn').on('click', function () {
    showQuestion(currentIndex + 1);
  });

  // Keyboard arrow key support: Left = previous, Right = next
  $(document).on('keydown', function (e) {
    // Ignore arrow keys when typing in an input/textarea or when a modal is open
    if ($(e.target).is('input, textarea') || $('.modal.show').length > 0) {
      return;
    }
    if (e.key === 'ArrowLeft') {
      showQuestion(currentIndex - 1);
    } else if (e.key === 'ArrowRight') {
      showQuestion(currentIndex + 1);
    }
  });

  // Submit & Grade
  $('#qa-submit-btn').on('click', gradeSheet);

  // Reset all answers and navigation
  $('#qa-reset-btn').on('click', resetSheet);

  // Show Answers: reveal correct answers and close the score modal
  $('#qa-show-answers-btn').on('click', function () {
    setAnswersRevealed(true);
    scoreModal.hide();
  });

  // Back to Questions: hide revealed answers and close the score modal
  $('#qa-back-to-sheet-btn').on('click', function () {
    setAnswersRevealed(false);
    scoreModal.hide();
  });

  // Restore the saved order/answers for this session if it exists.
  // sessionStorage survives page refreshes but is cleared when the
  // tab/site is closed, so a fresh shuffle happens on each new visit.
  const sessionRestored = restoreSession();

  // If this is a fresh visit, shuffle the question & choice order once.
  if (!sessionRestored && shuffleQuestions) {
    shuffleSheet();
  }

  // Initialize: show the first question and set initial unanswered state
  showQuestion(0);
  updateUnansweredState();

  /**
   * Grade the sheet using the same logic as tracker-sheet.js.
   * Decodes the Caesar-shifted answer keys, compares each selected
   * answer, and shows the score modal with the result label.
   */
  function gradeSheet() {
    const validationAlert = $('#qa-validation-alert');
    const scoreResult = $('#qa-score-result');
    const scoreCard = $('#qa-score-card');
    let score = 0;
    let total = cards.length;
    const missingRows = [];

    // Reset any previous state
    validationAlert.text('');
    validationModal.hide();
    scoreResult.text('');
    scoreCard.removeClass('result-failed result-qualifying result-good result-very-good result-outstanding');
    setAnswersRevealed(false);
    scoreModal.hide();

    // Clear previous grading marks on all cards
    cards.each(function () {
      const card = $(this);
      card.removeClass('correct incorrect border border-warning');
      card.find('.status-icon').text('').removeAttr('style');
      card.find('input[type="radio"]').removeAttr('data-is-correct');
    });

    updateUnansweredState();

    // Collect unanswered questions
    cards.each(function () {
      const card = $(this);
      const selectedInput = card.find('input[type="radio"]:checked');

      if (!selectedInput.length) {
        missingRows.push(this);
      }
    });

    // If there are unanswered questions and incomplete submission is not allowed,
    // show the validation modal and abort grading.
    if (missingRows.length > 0 && !allowIncompleteSubmit) {
      validationAlert.text(`Please answer all ${missingRows.length} remaining question${missingRows.length === 1 ? '' : 's'} before submitting.`);
      validationModal.show();
      return;
    }

    // Decode the Caesar-shifted answer keys only at grading time.
    const answerKeys = encodedKeys.split('').map(function (ch) {
      return String.fromCharCode(ch.charCodeAt(0) - 1);
    });

    // Grade each card
    cards.each(function () {
      const card = $(this);
      // Look up the answer key by the card's ORIGINAL index (shuffle-safe).
      const correctKey = answerKeys[card.data('question-index')];
      const selectedInput = card.find('input[type="radio"]:checked');
      const statusIcon = card.find('.status-icon');

      card.removeClass('correct incorrect');

      // Mark which radio is the correct answer (for "Show Answers" highlight)
      card.find('input[type="radio"]').each(function () {
        $(this).attr('data-is-correct', this.value === correctKey);
      });

      card.removeClass('border border-warning');

      if (selectedInput.val() === correctKey) {
        score++;
        card.addClass('correct');
        statusIcon.text('✓').css('color', '#16a34a');
      } else {
        card.addClass('incorrect');
        statusIcon.text('✗').css('color', '#dc2626');
      }
    });

    // Compute percentage and result label (same thresholds as tracker-sheet)
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
    let resultLabel = 'Failed';

    if (percentage >= 90) {
      resultLabel = 'Outstanding';
      scoreCard.addClass('result-outstanding');
    } else if (percentage >= 75) {
      resultLabel = 'Very Good';
      scoreCard.addClass('result-very-good');
    } else if (percentage >= 70) {
      resultLabel = 'Good Score (Area on General Weighted Average)';
      scoreCard.addClass('result-good');
    } else if (percentage > 50) {
      resultLabel = 'Qualifying (Minimum Subject Rating)';
      scoreCard.addClass('result-qualifying');
    } else {
      scoreCard.addClass('result-failed');
    }

    // Update score modal content and show it
    $('#qa-user-score').text(score);
    $('#qa-score-percentage').text(`${percentage}%`);
    scoreResult.text(resultLabel);
    scoreModal.show();
  }

  /**
   * Reset the entire sheet: clear all answers, grading marks,
   * and return to the first question.
   */
  function resetSheet() {
    $('#qa-form')[0].reset();
    $('#qa-score-card').removeClass('result-failed result-qualifying result-good result-very-good result-outstanding');
    $('#qa-validation-alert').text('');
    validationModal.hide();
    scoreModal.hide();
    setAnswersRevealed(false);
    $('#qa-score-result').text('');

    // Clear grading marks on all cards
    cards.each(function () {
      const card = $(this);
      card.removeClass('correct incorrect border border-warning');
      card.find('.status-icon').text('').removeAttr('style');
      card.find('input[type="radio"]').removeAttr('data-is-correct');
    });

    // Clear the saved session so this becomes a fresh attempt.
    try {
      sessionStorage.removeItem(sessionKey);
    } catch (e) {
      // Ignore storage failures - reset still works without persistence.
    }

    // Shuffle a fresh order for the new attempt (if enabled).
    if (shuffleQuestions) {
      shuffleSheet();
    }

    // Return to the first question
    showQuestion(0);
    updateUnansweredState();
  }
});
