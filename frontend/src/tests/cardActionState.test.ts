import { describe, expect, it } from 'vitest'
import {
	canAutoEnroll,
	resolveCardAction,
} from '@/composables/useCardAction'

/**
 * The three-way decision a course card's single action makes.
 *
 * These are the pure rules behind the card; the component test (courseCardAction.test.ts)
 * mounts the card to prove they reach the DOM. Kept apart because the interesting edges
 * are all value questions -- 99.9, missing membership, a guest -- and are far clearer
 * stated against the function than through a mount.
 */
describe('the card action state', () => {
	it('offers Start to a learner who is not enrolled', () => {
		expect(resolveCardAction({ progress: undefined })).toBe('start')
	})

	it('offers Start at zero progress', () => {
		expect(resolveCardAction({ progress: 0 })).toBe('start')
	})

	it('offers Continue partway through', () => {
		expect(resolveCardAction({ progress: 1 })).toBe('continue')
		expect(resolveCardAction({ progress: 42.4 })).toBe('continue')
		expect(resolveCardAction({ progress: 99.9 })).toBe('continue')
	})

	it('stops offering an action at 100', () => {
		expect(resolveCardAction({ progress: 100 })).toBe('completed')
		expect(resolveCardAction({ progress: 100 })).not.toBe('continue')
	})

	// 99.4% rounds up to a displayed 100%. Rounding before the comparison would tell a
	// learner with one lesson left that the course is done and hide the way back in.
	it('does not call a course finished because it rounds to 100', () => {
		expect(Math.ceil(99.4)).toBe(100)
		expect(resolveCardAction({ progress: 99.4 })).toBe('continue')
	})

	it('treats a missing or unusable progress as not enrolled', () => {
		expect(resolveCardAction({ progress: null })).toBe('start')
		expect(resolveCardAction({ progress: Number.NaN })).toBe('start')
	})

	it('is unaffected by whether the course is paid or self-learning-disabled', () => {
		// Those decide what invoking the action *does*, not which action is shown: a paid
		// course the learner has finished still reads as finished.
		expect(resolveCardAction({ progress: 100, paidCourse: true })).toBe('completed')
		expect(
			resolveCardAction({ progress: 50, disableSelfLearning: true })
		).toBe('continue')
	})
})

describe('whether Start can enrol on its own', () => {
	it('auto-enrols a free, open course', () => {
		expect(canAutoEnroll({ paidCourse: false, disableSelfLearning: false })).toBe(
			true
		)
	})

	// Bypassing either would take payment or the closed-to-self-learning rule less
	// seriously than the enrolment form does.
	it('refuses to auto-enrol a paid course', () => {
		expect(canAutoEnroll({ paidCourse: true, disableSelfLearning: false })).toBe(
			false
		)
	})

	it('refuses to auto-enrol a course closed to self-learning', () => {
		expect(canAutoEnroll({ paidCourse: false, disableSelfLearning: true })).toBe(
			false
		)
	})
})
