/**
 * tracker-sheet.js
 * Grading logic for the interactive answer sheet.
 *
 * The answer keys are Caesar-shifted (+1) and passed via the
 * `data-answer-keys` attribute on `.sheet-container` so they don't appear
 * in plaintext in the DOM / view-source. They are only decoded inside
 * gradeSheet() when the "Submit & Grade" button is clicked.
 */
$(function () {
  const allowIncompleteSubmit = false; // Set to true to allow submission without answering all questions
  const validationModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('validation-modal'));
  const scoreModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('score-modal'));
  const sheetContainer = $('.sheet-container');
  const encodedKeys = sheetContainer.data('answer-keys') || '';

  function setAnswersRevealed(revealed) {
    sheetContainer.toggleClass('answers-revealed', revealed);
  }

  function updateUnansweredState() {
    $('.q-row').each(function () {
      const row = $(this);
      const hasSelection = row.find('input[type="radio"]:checked').length > 0;
      row.toggleClass('unanswered', !hasSelection);
    });
  }

  $('.q-row input[type="radio"]').on('change', updateUnansweredState);
  $('#submit-btn').on('click', gradeSheet);
  $('#reset-btn').on('click', resetSheet);
  $('#show-answers-btn').on('click', function () {
    setAnswersRevealed(true);
    scoreModal.hide();
  });
  $('#back-to-sheet-btn').on('click', function () {
    setAnswersRevealed(false);
    scoreModal.hide();
  });
  updateUnansweredState();

  function gradeSheet() {
    const rows = $('.q-row');
    const validationAlert = $('#validation-alert');
    const scoreResult = $('#score-result');
    const scoreCard = $('#score-card');
    let score = 0;
    let total = rows.length;
    const missingRows = [];

    validationAlert.text('');
    validationModal.hide();
    scoreResult.text('');
    scoreCard.removeClass('result-failed result-qualifying result-good result-very-good result-outstanding');
    setAnswersRevealed(false);
    scoreModal.hide();

    rows.each(function () {
      const row = $(this);
      row.removeClass('correct incorrect border border-warning');
      row.find('.status-icon').text('').removeAttr('style');
      row.find('input[type="radio"]').removeAttr('data-is-correct');
    });

    updateUnansweredState();

    rows.each(function () {
      const row = $(this);
      const selectedInput = row.find('input[type="radio"]:checked');

      if (!selectedInput.length) {
        missingRows.push(this);
      }
    });

    if (missingRows.length > 0 && !allowIncompleteSubmit) {
      validationAlert.text(`Please answer all ${missingRows.length} remaining question${missingRows.length === 1 ? '' : 's'} before submitting.`);
      validationModal.show();
      return;
    }

    // Decode the Caesar-shifted answer keys only at grading time.
    const answerKeys = encodedKeys.split('').map(function (ch) {
      return String.fromCharCode(ch.charCodeAt(0) - 1);
    });

    rows.each(function (rowIndex) {
      const row = $(this);
      const correctKey = answerKeys[rowIndex];
      const selectedInput = row.find('input[type="radio"]:checked');
      const statusIcon = row.find('.status-icon');

      row.removeClass('correct incorrect');

      row.find('input[type="radio"]').each(function () {
        $(this).attr('data-is-correct', this.value === correctKey);
      });

      row.removeClass('border border-warning');

      if (selectedInput.val() === correctKey) {
        score++;
        row.addClass('correct');
        statusIcon.text('✓').css('color', '#16a34a');
      } else {
        row.addClass('incorrect');
        statusIcon.text('✗').css('color', '#dc2626');
      }
    });

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

    $('#user-score').text(score);
    $('#score-percentage').text(`${percentage}%`);
    scoreResult.text(resultLabel);
    scoreModal.show();
  }

  function resetSheet() {
    $('#bubble-form')[0].reset();
    $('#score-card').removeClass('result-failed result-qualifying result-good result-very-good result-outstanding');
    $('#validation-alert').text('');
    validationModal.hide();
    scoreModal.hide();
    setAnswersRevealed(false);
    $('#score-result').text('');

    $('.q-row').each(function () {
      const row = $(this);
      row.removeClass('correct incorrect border border-warning');
      row.find('.status-icon').text('').removeAttr('style');
      row.find('input[type="radio"]').removeAttr('data-is-correct');
    });
    updateUnansweredState();
  }
});