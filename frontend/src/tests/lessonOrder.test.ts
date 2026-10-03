import { describe, expect, it } from 'vitest'
import {
	isLessonComplete,
	nextLessonIn,
	nextLessonToDo,
	outlineLessons,
	type OutlineChapterLike,
} from '@/composables/useLessonOrder'

/**
 * Reading the course outline as one ordered list, and finding the lesson to advance to.
 *
 * Backs both Next controls -- the lesson sidebar (anchored to the open lesson) and the
 * course page (anchored to progress, since nothing is open there).
 */

// The annotation is load-bearing: `is_complete: 0` widens to `number` in an untyped array
// literal, and the interface deliberately narrows it to the 0/1/boolean the endpoint and
// the local completion update actually produce. `chapter` applies the same annotation to
// the inline fixtures below.
const chapter = (lessons: OutlineChapterLike['lessons']): OutlineChapterLike => ({
	lessons,
})

const outline: OutlineChapterLike[] = [
	{
		title: 'Chapter 1',
		lessons: [
			{ name: 'L1', number: '1-1', is_complete: 1 },
			{ name: 'L2', number: '1-2', is_complete: 1 },
			{ name: 'L3', number: '1-3', is_complete: 0 },
		],
	},
	{
		title: 'Chapter 2',
		lessons: [
			{ name: 'L4', number: '2-1', is_complete: 0 },
			{ name: 'L5', number: '2-2', is_complete: 0, locked: 1 },
		],
	},
]

describe('flattening the outline', () => {
	it('returns every lesson in chapter order', () => {
		expect(outlineLessons(outline).map((l) => l.number)).toEqual([
			'1-1',
			'1-2',
			'1-3',
			'2-1',
			'2-2',
		])
	})

	it('does not sort lesson numbers as strings', () => {
		// "1-10" sorts before "1-2" as a string. Chapter and lesson indices are numbers,
		// so the order has to come from the endpoint, not from comparing them.
		const many = [
			{
				lessons: [
					{ name: 'A', number: '1-2' },
					{ name: 'B', number: '1-10' },
				],
			},
		]
		expect(outlineLessons(many).map((l) => l.number)).toEqual(['1-2', '1-10'])
	})

	it('copes with a missing, empty, or malformed outline', () => {
		expect(outlineLessons(null)).toEqual([])
		expect(outlineLessons(undefined)).toEqual([])
		expect(outlineLessons([])).toEqual([])
		expect(outlineLessons([{ title: 'No lessons key' }])).toEqual([])
		expect(outlineLessons([{ lessons: null }])).toEqual([])
	})

	it('skips a chapter with no lessons without losing the others', () => {
		const mixed = [{ lessons: [] }, { lessons: [{ name: 'A', number: '1-1' }] }]
		expect(outlineLessons(mixed).map((l) => l.name)).toEqual(['A'])
	})
})

describe('the lesson after the open one', () => {
	const lessons = outlineLessons(outline)

	it('advances within a chapter', () => {
		expect(nextLessonIn(lessons, '1-1')?.number).toBe('1-2')
	})

	it('crosses a chapter boundary', () => {
		expect(nextLessonIn(lessons, '1-3')?.number).toBe('2-1')
	})

	it('has no answer on the last lesson', () => {
		expect(nextLessonIn(lessons, '2-2')).toBeNull()
	})

	it('reports a locked next lesson rather than hiding it', () => {
		// The lock is carried through so the control can render disabled with its reason,
		// rather than vanishing and leaving the learner to wonder why.
		expect(nextLessonIn(lessons, '2-1')?.locked).toBe(1)
	})

	// Falling back to the first lesson would move a learner backwards off a Next button
	// that promised to move them on.
	it('has no answer for a lesson that is not in the outline', () => {
		expect(nextLessonIn(lessons, '9-9')).toBeNull()
	})

	it('has no answer when nothing is selected', () => {
		expect(nextLessonIn(lessons, '')).toBeNull()
	})

	it('has no answer on an empty outline', () => {
		expect(nextLessonIn([], '1-1')).toBeNull()
	})
})

describe('the lesson to do when nothing is open', () => {
	it('is the first unfinished lesson', () => {
		expect(nextLessonToDo(outlineLessons(outline))?.number).toBe('1-3')
	})

	it('is the first lesson when none are finished', () => {
		const fresh = [chapter([{ name: 'A', number: '1-1', is_complete: 0 }])]
		expect(nextLessonToDo(outlineLessons(fresh))?.number).toBe('1-1')
	})

	it('falls back to the first lesson once the course is finished', () => {
		// A returning learner reopening a completed course should land at its start
		// rather than on a control that has nowhere to go.
		const done = [
			chapter([
				{ name: 'A', number: '1-1', is_complete: 1 },
				{ name: 'B', number: '1-2', is_complete: 1 },
			]),
		]
		expect(nextLessonToDo(outlineLessons(done))?.number).toBe('1-1')
	})

	it('has no answer on an empty outline', () => {
		expect(nextLessonToDo([])).toBeNull()
	})

	// The endpoint sends a Frappe Check (0/1) while the optimistic local update writes a
	// real true. Both 0 and false have to read as unfinished, and both 1 and true as
	// finished, or the Next target moves on a lesson the learner has not reached.
	it('reads 0 and false alike as not finished', () => {
		const mixed = [
			chapter([
				{ name: 'A', number: '1-1', is_complete: 1 },
				{ name: 'B', number: '1-2', is_complete: 0 },
				{ name: 'C', number: '1-3', is_complete: false },
			]),
		]
		expect(nextLessonToDo(outlineLessons(mixed))?.number).toBe('1-2')
	})

	it('reads a locally-set true as finished', () => {
		const mixed = [
			chapter([
				{ name: 'A', number: '1-1', is_complete: 1 },
				{ name: 'B', number: '1-2', is_complete: true },
				{ name: 'C', number: '1-3', is_complete: 0 },
			]),
		]
		expect(nextLessonToDo(outlineLessons(mixed))?.number).toBe('1-3')
	})
})

describe('telling a finished lesson from an unfinished one', () => {
	// `build_outline` writes a Frappe Check, so an unfinished lesson arrives as 0 -- and
	// `!0` is true, so the naive `!lesson.is_complete` test calls every lesson finished.
	it('treats 0 as unfinished', () => {
		expect(isLessonComplete({ is_complete: 0 })).toBe(false)
	})

	it('treats 1 as finished', () => {
		expect(isLessonComplete({ is_complete: 1 })).toBe(true)
	})

	// The sidebar and outline mark a lesson complete locally the moment it is finished,
	// over the top of the 0 the endpoint sent.
	it('treats a local true as finished', () => {
		expect(isLessonComplete({ is_complete: true })).toBe(true)
	})

	it('treats a missing flag as unfinished', () => {
		expect(isLessonComplete({})).toBe(false)
		expect(isLessonComplete(null)).toBe(false)
		expect(isLessonComplete(undefined)).toBe(false)
	})
})
