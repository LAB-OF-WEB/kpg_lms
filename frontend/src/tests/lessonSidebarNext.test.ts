import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The lesson sidebar's Next control and the completed-row fill.
 *
 * The ordering arithmetic is covered in lessonOrder.test.ts. This file is about the
 * sidebar's own decisions: when the control appears at all, when it is disabled and why,
 * where it navigates, and which rows get the green ground.
 */

const push = vi.hoisted(() => vi.fn())
const routeQuery = vi.hoisted(() => ({ studentView: undefined as string | undefined }))
const outlineState = vi.hoisted(() => ({
	data: [] as unknown[] | null,
	error: null as unknown,
}))

vi.mock('vue-router', () => ({
	// The sidebar reads `route.query.studentView` to keep the flag across lesson hops, so
	// the mock route is mutable rather than a fixed object.
	useRoute: () => ({ params: {}, query: routeQuery }),
	useRouter: () => ({ push }),
}))

vi.mock('frappe-ui', () => ({
	createResource: () => ({
		get data() {
			return outlineState.data
		},
		get error() {
			return outlineState.error
		},
		reload: vi.fn(),
	}),
	Button: {
		props: ['disabled', 'variant', 'size'],
		template:
			'<button :disabled="disabled" @click="$emit(\'click\')"><slot name="prefix"/><slot/><slot name="suffix"/></button>',
	},
}))

vi.stubGlobal('__', (s: string) => s)

const { default: StudentLessonSidebar } = await import(
	'@/components/StudentLessonSidebar.vue'
)

const lesson = (
	number: string,
	extra: Record<string, unknown> = {}
): Record<string, unknown> => ({
	name: `L${number}`,
	title: `Lesson ${number}`,
	number,
	icon: 'icon-file',
	// 0/1 rather than booleans: that is what get_course_outline actually sends, and the
	// completion fill has to be right for that shape.
	is_complete: 0,
	locked: 0,
	...extra,
})

const outline = [
	{
		name: 'CH-1',
		title: 'Chapter 1',
		idx: 1,
		lessons: [lesson('1-1', { is_complete: 1 }), lesson('1-2'), lesson('1-3', { locked: 1 })],
	},
	{ name: 'CH-2', title: 'Chapter 2', idx: 2, lessons: [lesson('2-1')] },
]

const mountSidebar = (props: Record<string, unknown> = {}) =>
	mount(StudentLessonSidebar, {
		props: {
			courseName: 'COURSE-1',
			courseTitle: 'Course 1',
			progress: 25,
			selectedLessonNumber: '1-1',
			...props,
		},
		global: {
			mocks: { __: (s: string) => s },
			stubs: { 'router-link': { props: ['to'], template: '<a><slot /></a>' } },
		},
	})

const nextButton = (wrapper: ReturnType<typeof mountSidebar>) =>
	wrapper.findAll('button').find((b) => b.text() === 'Next')

beforeEach(() => {
	push.mockClear()
	outlineState.data = outline
	outlineState.error = null
})

describe('the Next control', () => {
	it('is present below the lesson list', () => {
		const wrapper = mountSidebar()
		const next = nextButton(wrapper)

		expect(next).toBeDefined()
		expect(next?.classes()).toContain('w-full')
		// NFR-013: 44px touch target, which size="md" alone does not reach.
		expect(next?.classes()).toContain('!h-11')
	})

	it('advances to the following lesson', async () => {
		const wrapper = mountSidebar({ selectedLessonNumber: '1-1' })

		await nextButton(wrapper)?.trigger('click')

		expect(push).toHaveBeenCalledWith({
			name: 'Lesson',
			params: { courseName: 'COURSE-1', chapterNumber: '1', lessonNumber: '2' },
			query: undefined,
		})
	})

	it('crosses into the next chapter', async () => {
		const wrapper = mountSidebar({ selectedLessonNumber: '1-3' })

		await nextButton(wrapper)?.trigger('click')

		expect(push).toHaveBeenCalledWith(
			expect.objectContaining({
				params: { courseName: 'COURSE-1', chapterNumber: '2', lessonNumber: '1' },
			})
		)
	})

	it('is absent on the last lesson', () => {
		const wrapper = mountSidebar({ selectedLessonNumber: '2-1' })
		expect(nextButton(wrapper)).toBeUndefined()
	})

	it('keeps ?studentView=1 across the hop', async () => {
		// Without this a moderator previewing the course silently reverts to their own
		// identity on the first advance.
		routeQuery.studentView = '1'
		const wrapper = mountSidebar({ selectedLessonNumber: '1-1' })

		await nextButton(wrapper)?.trigger('click')

		expect(push).toHaveBeenCalledWith(
			expect.objectContaining({ query: { studentView: 1 } })
		)
	})

	it('adds no query on an ordinary lesson view', async () => {
		routeQuery.studentView = undefined
		const wrapper = mountSidebar({ selectedLessonNumber: '1-1' })

		await nextButton(wrapper)?.trigger('click')

		expect(push).toHaveBeenCalledWith(
			expect.objectContaining({ query: undefined })
		)
	})
})

describe('a locked next lesson', () => {
	const lockedNext = () => mountSidebar({ selectedLessonNumber: '1-2' })

	it('is disabled rather than hidden', () => {
		// A control that simply disappears leaves the learner wondering why they cannot
		// move on; disabled plus a reason answers the question.
		expect(nextButton(lockedNext())?.attributes('disabled')).toBeDefined()
	})

	it('explains why progression is blocked', () => {
		expect(lockedNext().text()).toContain('Complete the lessons above to continue.')
	})

	it('does not navigate when activated', async () => {
		const wrapper = lockedNext()
		await nextButton(wrapper)?.trigger('click')
		expect(push).not.toHaveBeenCalled()
	})

	it('says nothing about blocking when the next lesson is open', () => {
		const wrapper = mountSidebar({ selectedLessonNumber: '1-1' })
		expect(wrapper.text()).not.toContain('Complete the lessons above to continue.')
	})
})

describe('when the outline is unusable', () => {
	// NFR-003: a Next in an indeterminate state would either do nothing or send the
	// learner somewhere they did not expect.
	it('renders no Next while the outline has not loaded', () => {
		outlineState.data = null
		expect(nextButton(mountSidebar())).toBeUndefined()
	})

	it('renders no Next when the outline failed', () => {
		outlineState.error = new Error('boom')
		expect(nextButton(mountSidebar())).toBeUndefined()
	})

	it('renders no Next for an empty course', () => {
		outlineState.data = [{ name: 'CH-1', idx: 1, lessons: [] }]
		expect(nextButton(mountSidebar())).toBeUndefined()
	})

	it('renders no Next when no lesson is selected', () => {
		const wrapper = mountSidebar({ selectedLessonNumber: '' })
		expect(nextButton(wrapper)).toBeUndefined()
	})
})

describe('the completed-row fill', () => {
	// The classes land on the element that is the row's own control -- a router-link or a
	// button depending on the context -- not on the <li> that wraps it, so the lookup
	// goes to that first child.
	const rows = (wrapper: ReturnType<typeof mountSidebar>) =>
		wrapper.findAll('li li').map((row) => row.element.firstElementChild?.classList ?? [])

	it('fills a completed lesson', () => {
		const first = rows(mountSidebar())[0]
		expect(first).toContain('bg-surface-green-2')
	})

	// get_course_outline sends 0 for unfinished, and `0 && ...` is 0, so the naive test
	// would paint every row.
	it('does not fill an unfinished lesson', () => {
		expect(rows(mountSidebar())[1]).not.toContain('bg-surface-green-2')
	})

	it('does not fill a locked lesson', () => {
		// Its opacity already reads as unavailable; a green ground would say the opposite.
		const locked = rows(mountSidebar())[2]
		expect(locked).toContain('cursor-not-allowed')
		expect(locked).not.toContain('bg-surface-green-2')
	})

	// RISK-003: a lesson that is both finished and open keeps the active row's darker
	// ink on top of the tint, so "which one am I on" stays answerable.
	it('keeps the active row readable on a completed lesson', () => {
		const completedAndActive = rows(mountSidebar({ selectedLessonNumber: '1-1' }))[0]
		expect(completedAndActive).toContain('bg-surface-green-2')
		expect(completedAndActive).toContain('text-ink-gray-9')
	})

	it('leaves a chapter row unfilled', () => {
		// Only lesson rows carry the signal; a filled chapter header would read as a
		// chapter the learner had completed.
		const chapterRow = mountSidebar().findAll('button')[0]
		expect(chapterRow.classes()).not.toContain('bg-surface-green-2')
	})

	it('still marks completion with the tick, not colour alone', () => {
		// NFR-011: the fill is a legibility aid, the icon is the actual indicator.
		expect(mountSidebar().html()).toContain('lucide-circle-check')
	})
})
