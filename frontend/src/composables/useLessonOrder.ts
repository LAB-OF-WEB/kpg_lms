/**
 * Reading the course outline as one ordered list of lessons.
 *
 * `get_course_outline` returns chapters, each with its own `lessons`. Both the lesson
 * sidebar and the course page's outline need the same two things from that shape — the
 * flat order, and "the lesson after this one" — so the walk lives here once rather than
 * being written twice against a nested structure that is easy to get subtly wrong
 * (flattening in chapter order but comparing lesson numbers as strings, say).
 *
 * Pure functions over plain data: no Vue, no router, no fetch, so the ordering rules are
 * directly testable.
 */

export interface OutlineLessonLike {
	name: string
	title?: string
	/** `{chapterIdx}-{lessonIdx}`, e.g. `2-3`. */
	number: string
	is_complete?: 0 | 1 | boolean
	locked?: 0 | 1 | boolean
}

export interface OutlineChapterLike {
	title?: string
	lessons?: OutlineLessonLike[] | null
}

/**
 * Every lesson in course order.
 *
 * Chapters arrive in `idx` order and lessons within a chapter carry their own `idx`-derived
 * `number`, but neither list is re-sorted here: the endpoint already emits them in reading
 * order, and a chapter whose `lessons` is missing or empty contributes nothing rather than
 * breaking the walk.
 */
export function outlineLessons(
	chapters: OutlineChapterLike[] | null | undefined
): OutlineLessonLike[] {
	if (!Array.isArray(chapters)) return []
	const lessons: OutlineLessonLike[] = []
	for (const chapter of chapters) {
		if (!Array.isArray(chapter?.lessons)) continue
		lessons.push(...chapter.lessons)
	}
	return lessons
}

/**
 * The lesson that follows `currentNumber`, or null when there is none.
 *
 * Null is returned for an unknown `currentNumber` rather than falling back to the first
 * lesson: this backs a control that says "Next", and answering "the first one" for a
 * selection that is not in the outline would move the learner backwards without saying so.
 */
export function nextLessonIn(
	lessons: OutlineLessonLike[],
	currentNumber: string
): OutlineLessonLike | null {
	if (!currentNumber) return null
	const index = lessons.findIndex((lesson) => lesson.number === currentNumber)
	if (index === -1) return null
	return lessons[index + 1] ?? null
}

/**
 * Whether a lesson is finished.
 *
 * `build_outline` writes `is_complete` as a Frappe Check (0/1), and the sidebar's
 * optimistic completion update writes a real `true` on top of that. A plain `!value`
 * would read 0 as finished, because 0 is falsy-but-so-is-nothing -- so both shapes are
 * normalized here rather than at each call site.
 */
export function isLessonComplete(
	lesson: Pick<OutlineLessonLike, 'is_complete'> | null | undefined
): boolean {
	return lesson?.is_complete === 1 || lesson?.is_complete === true
}

/**
 * The lesson a learner should work on next when nothing is currently open.
 *
 * The course page has no "current lesson" — the learner has not opened one yet — so the
 * same "advance" gesture has to be anchored to progress instead of to a selection. That
 * is the first lesson not yet complete, falling back to the first lesson once the course
 * is finished, which is where a returning learner lands when they reopen a course they
 * have already worked through.
 *
 * Returns null for an empty outline, so a caller can render nothing rather than a control
 * with no destination.
 */
export function nextLessonToDo(
	lessons: OutlineLessonLike[]
): OutlineLessonLike | null {
	if (!lessons.length) return null
	return lessons.find((lesson) => !isLessonComplete(lesson)) ?? lessons[0]
}
