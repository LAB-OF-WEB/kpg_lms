import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { h } from 'vue'

/**
 * The course card's single action, as it reaches the DOM.
 *
 * The three-way state rule itself is covered in cardActionState.test.ts; this file is
 * about what the card does with it -- which label is rendered, whether a control is
 * actionable at all, where invoking it navigates, and that the action stays opt-in.
 */

const push = vi.hoisted(() => vi.fn())
const call = vi.hoisted(() => vi.fn())
const toastWarning = vi.hoisted(() => vi.fn())
const toastSuccess = vi.hoisted(() => vi.fn())
const currentUser = vi.hoisted(() => ({ value: 'learner@example.com' as string | null }))

vi.mock('vue-router', () => ({
	useRouter: () => ({ push }),
	useRoute: () => ({ params: {}, query: {} }),
}))

vi.mock('frappe-ui', () => ({
	// The real Button is a dynamic root that becomes a router-link or an anchor depending
	// on props; a plain stub keeps these assertions about the card's own logic.
	Button: {
		props: ['variant', 'size', 'loading', 'disabled'],
		template:
			'<button :disabled="disabled || loading" :data-loading="loading" @click="$emit(\'click\', $event)"><slot name="prefix"/><slot/><slot name="suffix"/></button>',
	},
	Badge: { template: '<span class="badge-stub"><slot/></span>' },
	Tooltip: { template: '<span><slot/></span>' },
	ProgressBar: true,
	// CourseInstructors and UserAvatar pull in more of the barrel than these tests need.
	call,
	toast: { warning: toastWarning, success: toastSuccess },
}))

// The card reads `user` through storeToRefs, so the store has to expose a real ref. A
// plain value here passes the component's own checks while failing against the actual
// Pinia store, which is exactly the bug this mock shape would hide.
vi.mock('@/stores/session', async () => {
	const { ref } = await import('vue')
	return {
		sessionStore: () => ({ user: ref(currentUser.value) }),
	}
})

vi.mock('@/components/CourseInstructors.vue', () => ({
	default: { template: '<span />' },
}))
vi.mock('@/components/UserAvatar.vue', () => ({
	default: { template: '<span />' },
}))
vi.mock('@/components/ProgressBar.vue', () => ({
	default: { template: '<span />' },
}))

// @/utils re-exports from the app's router module, which builds a real router on import.
// The card only needs these two formatters, so the module is stubbed rather than
// dragging a router into a test about buttons.
vi.mock('@/utils', () => ({
	formatAmount: (n: number) => String(n),
	formatRating: (n: number) => String(n),
}))
vi.mock('@/utils/theme', () => ({ theme: {} }))

vi.stubGlobal('__', (s: string) => s)

const { default: CourseCard } = await import('@/components/CourseCard.vue')

const baseCourse = {
	name: 'crm',
	title: 'Customer Relationship Management',
	short_introduction: 'Learn the CRM.',
	instructors: [],
	image: null,
	lessons: 5,
	card_gradient: 'blue',
}

const mountCard = (course: Record<string, unknown>, showAction = true) =>
	mount(CourseCard, {
		props: { course, showAction },
		global: { mocks: { __: (s: string) => s } },
	})

beforeEach(() => {
	push.mockClear()
	call.mockClear()
	toastWarning.mockClear()
	toastSuccess.mockClear()
	currentUser.value = 'learner@example.com'
})

describe('the label the card action carries', () => {
	it('says Start Course to a learner who is not enrolled', () => {
		const wrapper = mountCard(baseCourse)
		expect(wrapper.text()).toContain('Start Course')
		expect(wrapper.text()).not.toContain('Continue Course')
	})

	it('says Continue Course partway through', () => {
		const wrapper = mountCard({
			...baseCourse,
			membership: { progress: 40, current_lesson_index: '1-3' },
		})
		expect(wrapper.text()).toContain('Continue Course')
		expect(wrapper.text()).not.toContain('Start Course')
	})

	it('shows a Completed badge and no control once the course is done', () => {
		const wrapper = mountCard({
			...baseCourse,
			membership: { progress: 100, current_lesson_index: '2-4' },
		})
		expect(wrapper.text()).toContain('Completed')
		expect(wrapper.find('button').exists()).toBe(false)
	})

	// "exactly one action element" -- two controls here would leave the learner unsure
	// which one starts the course.
	it('renders one action and no other in any state', () => {
		for (const membership of [
			undefined,
			{ progress: 40, current_lesson_index: '1-3' },
			{ progress: 100, current_lesson_index: '2-4' },
		]) {
			const wrapper = mountCard({ ...baseCourse, membership })
			expect(wrapper.findAll('button').length).toBeLessThanOrEqual(1)
		}
	})
})

describe('the action is opt-in', () => {
	// Six surfaces render a card; only the learner-facing two asked for it.
	it('renders nothing when the call site did not opt in', () => {
		const wrapper = mountCard(
			{ ...baseCourse, membership: { progress: 40, current_lesson_index: '1-2' } },
			false
		)
		expect(wrapper.find('button').exists()).toBe(false)
		expect(wrapper.text()).not.toContain('Continue Course')
		expect(wrapper.text()).not.toContain('Start Course')
	})

	it('renders nothing for a guest even on an opted-in surface', () => {
		currentUser.value = null
		const wrapper = mountCard(baseCourse)
		expect(wrapper.find('button').exists()).toBe(false)
	})

	// Regression: the card read `user.value` while destructuring the Pinia store, which
	// already unwraps the ref. `user.value` was then undefined, so the action was
	// suppressed on every card. Any mock returning a plain value hides this, which is why
	// the store mock above yields a real ref and this case runs with the session set.
	it('shows the action for a signed-in learner, not a bare object', () => {
		currentUser.value = 'learner@example.com'
		const wrapper = mountCard(baseCourse)
		expect(wrapper.find('button').exists()).toBe(true)
		expect(wrapper.find('button').text()).toContain('Start Course')
	})
})

describe('invoking Continue Course', () => {
	it('goes to the lesson the server resolved', async () => {
		const wrapper = mountCard({
			...baseCourse,
			membership: { progress: 40, current_lesson_index: '2-3' },
		})

		await wrapper.find('button').trigger('click')

		expect(push).toHaveBeenCalledWith({
			name: 'Lesson',
			params: { courseName: 'crm', chapterNumber: '2', lessonNumber: '3' },
		})
		expect(call).not.toHaveBeenCalled()
	})

	it('opens the first lesson when there is no resolved lesson', async () => {
		// A brand new enrolment has no index, and 1-1 is where the course starts.
		const wrapper = mountCard({
			...baseCourse,
			membership: { progress: 0, current_lesson_index: null },
		})

		await wrapper.find('button').trigger('click')

		expect(push).toHaveBeenCalledWith({
			name: 'Lesson',
			params: { courseName: 'crm', chapterNumber: '1', lessonNumber: '1' },
		})
	})
})

describe('invoking Start Course on a free course', () => {
	it('enrols through the controller and then opens the first lesson', async () => {
		call.mockResolvedValue({ name: 'ENR-0001' })
		const wrapper = mountCard(baseCourse)

		await wrapper.find('button').trigger('click')
		await vi.waitFor(() => expect(push).toHaveBeenCalled())

		// The generic insert, not a bespoke endpoint: it runs the controller, so the
		// course's own eligibility rule still applies.
		expect(call).toHaveBeenCalledWith('frappe.client.insert', {
			doc: { doctype: 'LMS Enrollment', course: 'crm', member: 'learner@example.com' },
		})
		expect(push).toHaveBeenCalledWith({
			name: 'Lesson',
			params: { courseName: 'crm', chapterNumber: '1', lessonNumber: '1' },
		})
		expect(toastSuccess).toHaveBeenCalled()
	})

	// NFR-002: landing on a lesson for an enrolment that was never created would leave
	// the learner on a page they cannot read.
	it('does not navigate when the enrolment fails', async () => {
		call.mockRejectedValue({ messages: ['Not permitted'] })
		const wrapper = mountCard(baseCourse)

		await wrapper.find('button').trigger('click')
		await vi.waitFor(() => expect(toastWarning).toHaveBeenCalled())

		expect(push).not.toHaveBeenCalled()
		expect(toastWarning).toHaveBeenCalledWith('Not permitted')
	})

	it('does not enrol twice on a double click', async () => {
		let resolve: (v: unknown) => void = () => {}
		call.mockReturnValue(new Promise((r) => (resolve = r)))
		const wrapper = mountCard(baseCourse)

		const button = wrapper.find('button')
		await button.trigger('click')
		await button.trigger('click')

		expect(call).toHaveBeenCalledTimes(1)
		resolve({})
	})
})

describe('Start Course on a course that cannot be self-enrolled', () => {
	it('sends a paid course to billing without creating an enrolment', async () => {
		const wrapper = mountCard({ ...baseCourse, paid_course: 1 })

		await wrapper.find('button').trigger('click')

		expect(call).not.toHaveBeenCalled()
		expect(push).toHaveBeenCalledWith({
			name: 'Billing',
			params: { type: 'course', name: 'crm' },
		})
	})

	it('explains a self-learning-disabled course rather than enrolling', async () => {
		const wrapper = mountCard({ ...baseCourse, disable_self_learning: 1 })

		await wrapper.find('button').trigger('click')

		expect(call).not.toHaveBeenCalled()
		expect(push).not.toHaveBeenCalled()
		expect(toastWarning).toHaveBeenCalled()
	})
})

/**
 * The action's place inside the wrapping card link.
 *
 * The card is wrapped in a router-link on every surface that opts in, and `@click.stop`
 * alone does not stop that navigation: the browser follows the anchor's href as the
 * default action of any click inside it. So the learner reached the course page instead
 * of the lesson, and every behavioural test above still passed -- jsdom does not perform
 * an anchor's default action for a click on a nested control, so the missing
 * `preventDefault` was invisible here and only showed up in a browser.
 *
 * What is asserted below is the half a unit test can reach: the click does not reach the
 * enclosing link's handler. The `prevent` half is load-bearing in the template and is
 * marked as such there; verifying it needs a real browser, which is where it was checked.
 */
describe('the action inside the card link', () => {
	it('does not let its click reach the enclosing link', async () => {
		const linkHandler = vi.fn()
		const wrapper = mount(
			{
				setup: () => () =>
					h(
						'a',
						{ href: '/lms/courses/crm', onClick: linkHandler },
						[h(CourseCard, { course: baseCourse, showAction: true })]
					),
			},
			{ global: { mocks: { __: (s: string) => s } } }
		)

		await wrapper.find('button').trigger('click')

		// If the click reached the anchor, the router-link would navigate to the course
		// page and the action would appear to do nothing.
		expect(linkHandler).not.toHaveBeenCalled()
	})

	it('keeps the 44px touch target NFR-013 asks for', () => {
		const wrapper = mountCard(baseCourse)
		// size="md" is 32px on its own; the override is what reaches 44px.
		expect(wrapper.find('button').classes()).toContain('!h-11')
	})
})
