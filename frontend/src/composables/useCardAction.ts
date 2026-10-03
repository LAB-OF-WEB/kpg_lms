/**
 * The state a course card's single action should be in.
 *
 * Shared by the card and its tests so the three-way decision is stated once. Kept
 * separate from the component because the rules are pure: nothing here reads the
 * router, the session, or the DOM, so each branch is directly testable.
 */

export type CardActionState = 'start' | 'continue' | 'completed' | 'none'

export interface CardActionInput {
	/** `LMS Enrollment.progress` for this user and course; absent when not enrolled. */
	progress?: number | null
	paidCourse?: boolean
	disableSelfLearning?: boolean
}

/**
 * `progress` at or above 100 is finished, so the card stops offering to start
 * something. The comparison is on the raw value rather than `Math.ceil`, which
 * would report 100% for a course that is 99.4% done.
 */
export function resolveCardAction({
	progress,
	paidCourse,
	disableSelfLearning,
}: CardActionInput): CardActionState {
	if (typeof progress !== 'number' || Number.isNaN(progress)) return 'start'
	if (progress >= 100) return 'completed'
	if (progress > 0) return 'continue'
	return 'start'
}

/**
 * Whether invoking `Start Course` can create the enrolment itself.
 *
 * Paid courses go through the billing form and self-learning-disabled courses are
 * closed to the learner, so neither may be auto-enrolled: the shortcut is for the
 * free, open course only. Both facts arrive on the card payload, so this needs no
 * request of its own.
 */
export function canAutoEnroll({
	paidCourse,
	disableSelfLearning,
}: Pick<CardActionInput, 'paidCourse' | 'disableSelfLearning'>): boolean {
	return !paidCourse && !disableSelfLearning
}
