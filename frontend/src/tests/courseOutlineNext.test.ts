import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The course page's outline: its Next control, and the completed-row fill inside
 * ChapterRow.
 *
 * The Next here is anchored differently from the sidebar's. Nothing is open on the
 * course page, so there is no "current lesson" to advance past; the control targets the
 * first unfinished lesson instead. The arithmetic is covered in lessonOrder.test.ts.
 */

const push = vi.hoisted(() => vi.fn())
const outlineState = vi.hoisted(() => ({
	data: [] as unknown[] | null,
	error: null as unknown,
}))

vi.mock('vue-router', () => ({
	useRoute: () => ({ params: {}, query: {}, hash: '' }),
	useRouter: () => ({ push }),
	useLink: () => ({ route: { value: { query: {} } }, href: '#', isActive: false }),
	RouterLink: { template: '<a><slot /></a>' },
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
		submit: vi.fn(),
	}),
	Button: {
		props: ['disabled', 'variant', 'size'],
		template:
			'<button :disabled="disabled" @click="$emit(\'click\')"><slot name="prefix"/><slot/><slot name="suffix"/></button>',
	},
	TextInput: { template: '<input />' },
	Tooltip: { template: '<span><slot /></span>' },
	toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('vuedraggable', () => ({
	default: {
		props: ['list', 'disabled', 'group', 'itemKey'],
		template:
			'<div><template v-for="(item, i) in list" :key="item[itemKey]"><slot name="item" :element="item" :index="i" /></template></div>',
	},
}))

vi.mock('@/composables/useFormRoute', () => ({ openFormRoute: vi.fn() }))

vi.stubGlobal('__', (s: string) => s)

const { default: CourseOutline } = await import('@/components/CourseOutline.vue')

const lesson = (
	number: string,
	extra: Record<string, unknown> = {}
): Record<string, unknown> => ({
	name: `L${number}`,
	title: `Lesson ${number}`,
	number,
	icon: 'icon-file',
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
]

const mountOutline = (props: Record<string, unknown> = {}) =>
	mount(CourseOutline, {
		props: {
			courseName: 'COURSE-1',
			showOutline: true,
			// getProgress is what makes the endpoint return is_complete at all.
			getProgress: true,
			...props,
		},
		global: {
			mocks: { __: (s: string) => s, $user: { data: { name: 'learner@example.com' } } },
			stubs: { 'router-link': { props: ['to'], template: '<a><slot /></a>' } },
		},
	})

const nextButton = (wrapper: ReturnType<typeof mountOutline>) =>
	wrapper.findAll('button').find((b) => b.text() === 'Next')

beforeEach(() => {
	push.mockClear()
	outlineState.data = outline
	outlineState.error = null
})

describe('the course page Next control', () => {
	it('targets the first unfinished lesson', async () => {
		const wrapper = mountOutline()

		await nextButton(wrapper)?.trigger('click')

		// Nothing is open on this page, so "next" is the first lesson not yet done.
		expect(push).toHaveBeenCalledWith({
			name: 'Lesson',
			params: { courseName: 'COURSE-1', chapterNumber: '1', lessonNumber: '2' },
		})
	})

	it('falls back to the first lesson on a finished course', async () => {
		outlineState.data = [
			{
				name: 'CH-1',
				title: 'Chapter 1',
				idx: 1,
				lessons: [
					lesson('1-1', { is_complete: 1 }),
					lesson('1-2', { is_complete: 1 }),
				],
			},
		]
		const wrapper = mountOutline()

		await nextButton(wrapper)?.trigger('click')

		expect(push).toHaveBeenCalledWith(
			expect.objectContaining({
				params: { courseName: 'COURSE-1', chapterNumber: '1', lessonNumber: '1' },
			})
		)
	})

	it('is disabled with a reason when the next lesson is locked', () => {
		outlineState.data = [
			{
				name: 'CH-1',
				title: 'Chapter 1',
				idx: 1,
				lessons: [lesson('1-1', { locked: 1 })],
			},
		]
		const wrapper = mountOutline()

		expect(nextButton(wrapper)?.attributes('disabled')).toBeDefined()
		expect(wrapper.text()).toContain('Complete the lessons above to continue.')
	})

	it('is absent when the outline has not loaded', () => {
		outlineState.data = null
		expect(nextButton(mountOutline())).toBeUndefined()
	})

	it('is absent when the outline failed', () => {
		outlineState.error = new Error('boom')
		expect(nextButton(mountOutline())).toBeUndefined()
	})

	it('is absent when the outline is empty', () => {
		outlineState.data = []
		expect(nextButton(mountOutline())).toBeUndefined()
	})

	// Without getProgress the endpoint omits is_complete, so every lesson looks
	// unfinished and the control would send the learner back to lesson 1 every time.
	it('is absent when progress was not requested', () => {
		expect(nextButton(mountOutline({ getProgress: false }))).toBeUndefined()
	})

	// In the editor the outline is an authoring surface, and in inline-select it is a
	// picker; a Next that navigates out of either would be wrong.
	it('is absent in the editor and in inline-select', () => {
		expect(nextButton(mountOutline({ allowEdit: true }))).toBeUndefined()
		expect(nextButton(mountOutline({ inlineSelect: true }))).toBeUndefined()
	})
})

describe('the completed-row fill on the course page', () => {
	const rowClasses = (wrapper: ReturnType<typeof mountOutline>, index: number) =>
		wrapper.findAll('.outline-lesson')[index].classes()

	it('fills a completed lesson', () => {
		expect(rowClasses(mountOutline(), 0)).toContain('bg-surface-green-2')
	})

	it('does not fill an unfinished lesson', () => {
		expect(rowClasses(mountOutline(), 1)).not.toContain('bg-surface-green-2')
	})

	it('does not fill a locked lesson', () => {
		expect(rowClasses(mountOutline(), 2)).not.toContain('bg-surface-green-2')
	})
})
