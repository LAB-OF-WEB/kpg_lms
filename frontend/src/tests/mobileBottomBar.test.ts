/**
 * The phone shell: a KPG drawer, not a bottom tab bar.
 *
 * Deliberate redesign (2026-10): MobileLayout used to render a bottom tab bar
 * (Home / Courses / Batches / Programs / You). It now renders the same KPG
 * rail as desktop inside an off-canvas drawer, so there is one consistent
 * shell on every screen size and the Back to Desk link is reachable on phones.
 * The tab taxonomy utils (pickPrimaryTabs) still serve the You page and keep
 * their own suite in mobileNav.test.ts — only the layout contract changed.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { defineComponent, h } from 'vue'

vi.stubGlobal('__', (text: string) => text)
enableAutoUnmount(afterEach)

vi.mock('@/components/Sidebar/AppSidebar.vue', () => ({
	default: defineComponent({
		name: 'AppSidebar',
		template: '<div data-testid="app-sidebar-stub" />',
	}),
}))

vi.mock('@/utils/a11y', () => ({
	skipToContent: vi.fn(),
}))

import MobileLayout from '@/components/Layouts/MobileLayout.vue'

const Blank = defineComponent({ render: () => h('div') })

const openDrawer = async (path = '/') => {
	const router = createRouter({
		history: createMemoryHistory(),
		routes: [
			{ path: '/', name: 'Home', component: Blank },
			{ path: '/courses', name: 'Courses', component: Blank },
			{ path: '/:rest(.*)', component: Blank },
		],
	})
	router.push(path)
	await router.isReady()
	const wrapper = mount(MobileLayout, {
		global: { plugins: [router], mocks: { __: (text: string) => text } },
	})
	await flushPromises()
	return { wrapper, router }
}

describe('the mobile drawer', () => {
	it('renders a menu toggle and starts shut', async () => {
		const { wrapper } = await openDrawer()
		const toggle = wrapper.find('.kpg-lms-toggle')
		expect(toggle.exists()).toBe(true)
		expect(toggle.attributes('aria-label')).toBe('Open menu')
		expect(wrapper.find('.kpg-lms-drawer').classes()).not.toContain('open')
		expect(wrapper.find('.kpg-lms-scrim').classes()).not.toContain('show')
	})

	it('opens on toggle and closes on the scrim', async () => {
		const { wrapper } = await openDrawer()
		await wrapper.find('.kpg-lms-toggle').trigger('click')
		expect(wrapper.find('.kpg-lms-drawer').classes()).toContain('open')
		expect(wrapper.find('.kpg-lms-scrim').classes()).toContain('show')
		await wrapper.find('.kpg-lms-scrim').trigger('click')
		expect(wrapper.find('.kpg-lms-drawer').classes()).not.toContain('open')
	})

	it('closes on Escape', async () => {
		const { wrapper } = await openDrawer()
		await wrapper.find('.kpg-lms-toggle').trigger('click')
		expect(wrapper.find('.kpg-lms-drawer').classes()).toContain('open')
		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
		await flushPromises()
		expect(wrapper.find('.kpg-lms-drawer').classes()).not.toContain('open')
	})

	it('closes on route change', async () => {
		const { wrapper, router } = await openDrawer()
		await wrapper.find('.kpg-lms-toggle').trigger('click')
		expect(wrapper.find('.kpg-lms-drawer').classes()).toContain('open')
		await router.push('/courses')
		await flushPromises()
		expect(wrapper.find('.kpg-lms-drawer').classes()).not.toContain('open')
	})

	it('carries the same sidebar as desktop', async () => {
		const { wrapper } = await openDrawer()
		expect(wrapper.find('[data-testid="app-sidebar-stub"]').exists()).toBe(
			true
		)
	})

	it('renders no bottom tab bar', async () => {
		const { wrapper } = await openDrawer()
		expect(wrapper.find('nav').exists()).toBe(false)
	})
})
