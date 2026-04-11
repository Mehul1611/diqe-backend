import type { UiLanguage, OnboardingCopy, ModeLabels } from './onboarding-text'
import { ONBOARDING_COPY, MODE_LABELS, QUERY_PLACEHOLDER } from './onboarding-text'

export type { UiLanguage, OnboardingCopy, ModeLabels } from './onboarding-text'
export { ONBOARDING_COPY, MODE_LABELS, QUERY_PLACEHOLDER } from './onboarding-text'

export function getOnboardingCopy(language: string): OnboardingCopy {
    const key = language as UiLanguage
    return ONBOARDING_COPY[key] ?? ONBOARDING_COPY.English
}

export function getModeLabels(language: string): ModeLabels {
    const key = language as UiLanguage
    return MODE_LABELS[key] ?? MODE_LABELS.English
}

export function getQueryPlaceholder(language: string): string {
    const key = language as UiLanguage
    return QUERY_PLACEHOLDER[key] ?? QUERY_PLACEHOLDER.English
}
