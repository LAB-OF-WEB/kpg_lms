<template>
	<div class="kpg-topbar-search-wrap" ref="searchWrapRef">
		<span class="kpg-topbar-search-icon" aria-hidden="true">
			<Search class="h-3.5 w-3.5" />
		</span>
		<input
			ref="inputRef"
			type="text"
			class="kpg-topbar-search-input"
			:class="{ 'kpg-search-focused': isOpen }"
			v-model="query"
			:placeholder="__('Search leads, customers, projects…')"
			autocomplete="off"
			spellcheck="false"
			@focus="onFocus"
			@input="onInput"
			@keydown.down.prevent="onArrowDown"
			@keydown.up.prevent="onArrowUp"
			@keydown.enter.prevent="onEnter"
			@keydown.esc.prevent="closeDropdown"
		/>

		<!-- CRM autocomplete dropdown flush underneath the input -->
		<ul
			v-if="isOpen && filteredItems.length > 0"
			class="kpg-search-dropdown"
			role="listbox"
		>
			<li
				v-for="(item, idx) in filteredItems"
				:key="item.value + '-' + idx"
				class="kpg-search-item"
				:class="{ 'kpg-search-active': activeIndex === idx }"
				role="option"
				:aria-selected="activeIndex === idx"
				@mouseenter="activeIndex = idx"
				@mousedown.prevent="selectItem(item)"
			>
				<span v-safe-html:basic="renderItemLabel(item, query)"></span>
			</li>
		</ul>

		<!-- Help on Search Dialog -->
		<Dialog
			v-model="showHelp"
			:title="__('Search Help')"
			size="sm"
		>
			<template #default>
				<div class="text-p-sm text-ink-gray-8 space-y-3 py-1">
					<p class="font-medium text-ink-gray-9">
						{{ __('How to search in CRM & Desk:') }}
					</p>
					<div class="border border-outline-gray-2 rounded-md divide-y divide-outline-gray-2 text-xs">
						<div class="flex justify-between p-2">
							<span class="font-semibold text-ink-gray-9">{{ __('Lead / Deal / User') }}</span>
							<span class="text-ink-gray-6">{{ __('Open document list') }}</span>
						</div>
						<div class="flex justify-between p-2">
							<span class="font-semibold text-ink-gray-9">{{ __('New Lead / New Deal') }}</span>
							<span class="text-ink-gray-6">{{ __('Create a new record') }}</span>
						</div>
						<div class="flex justify-between p-2">
							<span class="font-semibold text-ink-gray-9">{{ __('Container Booking') }}</span>
							<span class="text-ink-gray-6">{{ __('Open container bookings') }}</span>
						</div>
						<div class="flex justify-between p-2">
							<span class="font-semibold text-ink-gray-9">{{ __('Accounting / HR') }}</span>
							<span class="text-ink-gray-6">{{ __('Open workspace') }}</span>
						</div>
					</div>
				</div>
			</template>
		</Dialog>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { Dialog } from 'frappe-ui'
import { Search } from 'lucide-vue-next'

interface SearchItem {
	label: string
	value: string
	href?: string
	isHelp?: boolean
	boldPrefix?: string
}

const router = useRouter()
const query = ref('')
const isOpen = ref(false)
const activeIndex = ref(0)
const showHelp = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)
const searchWrapRef = ref<HTMLElement | null>(null)

/**
 * Exact default items matching CRM Desk Screenshot 2:
 * 1. Lead List (Lead bolded)
 * 2. User List
 * 3. Container Booking List
 * 4. Lead List (Lead bolded)
 * 5. Deal List
 * 6. Employee List
 * 7. Help on Search
 */
const DEFAULT_ITEMS: SearchItem[] = [
	{ label: 'Lead List', value: 'Lead List', boldPrefix: 'Lead', href: '/app/lead' },
	{ label: 'User List', value: 'User List', href: '/app/user' },
	{ label: 'Container Booking List', value: 'Container Booking List', href: '/app/container-booking' },
	{ label: 'Lead List', value: 'Lead List', boldPrefix: 'Lead', href: '/app/lead' },
	{ label: 'Deal List', value: 'Deal List', href: '/app/deal' },
	{ label: 'Employee List', value: 'Employee List', href: '/app/employee' },
	{ label: 'Help on Search', value: 'Help on Search', isHelp: true },
]

/**
 * Registry of searchable CRM doctypes and destinations
 */
const ALL_CRM_ITEMS: SearchItem[] = [
	{ label: 'Lead List', value: 'Lead List', href: '/app/lead' },
	{ label: 'New Lead', value: 'New Lead', href: '/app/lead/new' },
	{ label: 'Deal List', value: 'Deal List', href: '/app/deal' },
	{ label: 'New Deal', value: 'New Deal', href: '/app/deal/new' },
	{ label: 'Customer List', value: 'Customer List', href: '/app/customer' },
	{ label: 'New Customer', value: 'New Customer', href: '/app/customer/new' },
	{ label: 'Container Booking List', value: 'Container Booking List', href: '/app/container-booking' },
	{ label: 'New Container Booking', value: 'New Container Booking', href: '/app/container-booking/new' },
	{ label: 'User List', value: 'User List', href: '/app/user' },
	{ label: 'Employee List', value: 'Employee List', href: '/app/employee' },
	{ label: 'KPG Enquiry List', value: 'KPG Enquiry List', href: '/app/kpg-enquiry' },
	{ label: 'New KPG Enquiry', value: 'New KPG Enquiry', href: '/app/kpg-enquiry/new' },
	{ label: 'Agromart Dashboard', value: 'Agromart Dashboard', href: '/app/agro-dashboard' },
	{ label: 'KPG Dashboard', value: 'KPG Dashboard', href: '/app/kpg-dashboard' },
	{ label: 'Accounting Workspace', value: 'Accounting Workspace', href: '/app/accounting' },
	{ label: 'HR Workspace', value: 'HR Workspace', href: '/app/hr' },
	{ label: 'Support Workspace', value: 'Support Workspace', href: '/app/support' },
	{ label: 'Project List', value: 'Project List', href: '/app/project' },
	{ label: 'Task List', value: 'Task List', href: '/app/task' },
	{ label: 'Quotation List', value: 'Quotation List', href: '/app/quotation' },
	{ label: 'Sales Order List', value: 'Sales Order List', href: '/app/sales-order' },
	{ label: 'Sales Invoice List', value: 'Sales Invoice List', href: '/app/sales-invoice' },
	{ label: 'Payment Entry List', value: 'Payment Entry List', href: '/app/payment-entry' },
	{ label: 'Item List', value: 'Item List', href: '/app/item' },
	{ label: 'Contact List', value: 'Contact List', href: '/app/contact' },
]

const filteredItems = computed<SearchItem[]>(() => {
	const q = query.value.trim().toLowerCase()
	if (!q) {
		return DEFAULT_ITEMS
	}

	const results: SearchItem[] = []
	for (const item of ALL_CRM_ITEMS) {
		if (item.value.toLowerCase().includes(q)) {
			results.push(item)
		}
	}

	// Always include Help on Search option
	results.push({ label: 'Help on Search', value: 'Help on Search', isHelp: true })
	return results
})

function onFocus() {
	isOpen.value = true
	activeIndex.value = 0
}

function onInput() {
	isOpen.value = true
	activeIndex.value = 0
}

function onArrowDown() {
	if (!isOpen.value) {
		isOpen.value = true
		activeIndex.value = 0
		return
	}
	if (filteredItems.value.length === 0) return
	activeIndex.value = (activeIndex.value + 1) % filteredItems.value.length
}

function onArrowUp() {
	if (!isOpen.value) {
		isOpen.value = true
		activeIndex.value = 0
		return
	}
	if (filteredItems.value.length === 0) return
	activeIndex.value = (activeIndex.value - 1 + filteredItems.value.length) % filteredItems.value.length
}

function onEnter() {
	if (isOpen.value && filteredItems.value.length > 0) {
		const item = filteredItems.value[activeIndex.value] || filteredItems.value[0]
		selectItem(item)
	}
}

function selectItem(item: SearchItem) {
	closeDropdown()
	if (item.isHelp) {
		showHelp.value = true
		return
	}

	if (item.href) {
		if (item.href.startsWith('/app/') || item.href.startsWith('/app')) {
			window.location.href = item.href
		} else if (router) {
			router.push(item.href)
		} else {
			window.location.href = item.href
		}
	}
}

function closeDropdown() {
	isOpen.value = false
	activeIndex.value = 0
	if (inputRef.value) {
		inputRef.value.blur()
	}
}

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
}

function renderItemLabel(item: SearchItem, currentQuery: string): string {
	const q = currentQuery.trim().toLowerCase()

	// When query is active, bold the matched text
	if (q) {
		const label = item.label
		const idx = label.toLowerCase().indexOf(q)
		if (idx !== -1) {
			const before = escapeHtml(label.substring(0, idx))
			const match = escapeHtml(label.substring(idx, idx + q.length))
			const after = escapeHtml(label.substring(idx + q.length))
			return `${before}<strong>${match}</strong>${after}`
		}
	}

	// Default state matching Screenshot 2 (e.g. Lead List has Lead bolded)
	if (item.boldPrefix && item.label.startsWith(item.boldPrefix)) {
		const rest = item.label.substring(item.boldPrefix.length)
		return `<strong>${escapeHtml(item.boldPrefix)}</strong>${escapeHtml(rest)}`
	}

	return escapeHtml(item.label)
}

function handleClickOutside(event: MouseEvent) {
	if (searchWrapRef.value && !searchWrapRef.value.contains(event.target as Node)) {
		isOpen.value = false
	}
}

function handleKeydown(event: KeyboardEvent) {
	// Ctrl+K / Cmd+K focuses the input
	if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
		event.preventDefault()
		nextTick(() => {
			inputRef.value?.focus()
			isOpen.value = true
		})
	}
}

onMounted(() => {
	document.addEventListener('click', handleClickOutside)
	window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
	document.removeEventListener('click', handleClickOutside)
	window.removeEventListener('keydown', handleKeydown)
})
</script>
