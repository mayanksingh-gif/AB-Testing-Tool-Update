// Predefined post-test question suggestions for the A/B test creation/edit
// form only. These are just canned strings a researcher can click to fill
// the existing `post_test_question` field — no new data model, no effect on
// usability testing, participant links, Figma tracking, completion
// detection, or analytics.
export interface PostTestQuestionTemplate {
  id: string;
  label: string;
  question: string;
}

export const POST_TEST_QUESTION_TEMPLATES: PostTestQuestionTemplate[] = [
  { id: "difficult-part", label: "Most difficult part", question: "What was the most difficult part of this task?" },
  { id: "confusing", label: "Anything confusing?", question: "Was anything confusing or unexpected?" },
  { id: "improve", label: "What would you improve?", question: "What would you improve about this experience?" },
  { id: "like-most", label: "What did you like most?", question: "What did you like most about this experience?" },
  { id: "like-least", label: "What did you like least?", question: "What did you like least about this experience?" },
  { id: "easy-or-difficult", label: "Easy or difficult?", question: "What made this task easy or difficult?" },
  { id: "expected-not-found", label: "Anything missing?", question: "Was there anything you expected to find but couldn’t?" },
  { id: "what-change", label: "What would you change?", question: "What would you change to make this easier?" },
  { id: "vs-expectations", label: "Vs. expectations", question: "How did this experience compare with what you expected?" },
  { id: "anything-else", label: "Anything else?", question: "Is there anything else you’d like to tell us?" },
];
