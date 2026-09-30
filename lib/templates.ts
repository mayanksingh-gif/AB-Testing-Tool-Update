// A/B test templates — configuration presets only. Selecting one pre-fills
// suggested form values on the New Test page; it never changes underlying
// testing logic (same tables, same actions, same metrics engine).
export interface TestTemplate {
  id: string;
  name: string;
  goal: string;
  suggestedMetrics: string[];
  titleSuggestion: string;
  exampleTask: string;
  successGuidance: string;
}

export const TEST_TEMPLATES: TestTemplate[] = [
  {
    id: "cta-discoverability",
    name: "CTA Discoverability",
    goal: "Compare how easily participants find an important CTA.",
    suggestedMetrics: [
      "Time to first target interaction",
      "Task completion",
      "Interactions before target",
      "Unhandled interactions",
    ],
    titleSuggestion: "CTA Discoverability Test",
    exampleTask: "Find and select the \"Upgrade Plan\" button.",
    successGuidance:
      "Set the final screen link to the screen that appears right after the CTA is pressed (e.g. an upgrade confirmation screen).",
  },
  {
    id: "navigation-findability",
    name: "Navigation / Findability",
    goal: "Compare how easily participants find a feature or setting.",
    suggestedMetrics: [
      "Completion time",
      "Frames visited",
      "Backtracking",
      "Wrong paths",
      "Success rate",
    ],
    titleSuggestion: "Navigation Findability Test",
    exampleTask: "Find account settings and change your password.",
    successGuidance:
      "Set the final screen link to the settings/confirmation screen the participant should reach once the setting is found.",
  },
  {
    id: "checkout-flow",
    name: "Checkout Flow",
    goal: "Compare two checkout experiences.",
    suggestedMetrics: [
      "Completion rate",
      "Completion time",
      "Number of steps/screens",
      "Backtracking",
      "Interactions",
    ],
    titleSuggestion: "Checkout Flow Test",
    exampleTask: "Add an item to your cart and complete checkout.",
    successGuidance: "Set the final screen link to the order-confirmation screen.",
  },
  {
    id: "onboarding-flow",
    name: "Onboarding Flow",
    goal: "Compare two onboarding experiences.",
    suggestedMetrics: ["Completion rate", "Completion time", "Screens visited", "Abandonment"],
    titleSuggestion: "Onboarding Flow Test",
    exampleTask: "Complete the onboarding steps until you reach the home screen.",
    successGuidance: "Set the final screen link to the first screen shown after onboarding completes.",
  },
  {
    id: "form-data-entry",
    name: "Form / Data Entry",
    goal: "Compare two form designs.",
    suggestedMetrics: ["Completion time", "Interactions", "Abandoned sessions", "Repeated navigation"],
    titleSuggestion: "Form Design Test",
    exampleTask: "Fill out and submit the form.",
    successGuidance: "Set the final screen link to the submission-success screen.",
  },
  {
    id: "custom",
    name: "Custom",
    goal: "Blank test — configure everything yourself.",
    suggestedMetrics: [],
    titleSuggestion: "",
    exampleTask: "",
    successGuidance: "",
  },
];

export function getTemplate(id: string | null | undefined): TestTemplate | undefined {
  return TEST_TEMPLATES.find((t) => t.id === id);
}
