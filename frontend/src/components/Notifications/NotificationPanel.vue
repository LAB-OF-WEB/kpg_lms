<template>
	<Teleport to="body">
		<div
			v-if="panelVisible"
			ref="panelRef"
			class="kpg-notification-dropdown"
			:style="dropdownStyle"
			role="dialog"
			aria-label="Notifications"
		>
			<!-- Header -->
			<div class="kpg-notification-header">
				<!-- Tabs -->
				<div class="kpg-notification-tabs">
					<button
						type="button"
						class="kpg-notification-tab"
						:class="{ active: activeTab === 'notifications' }"
						@click="activeTab = 'notifications'"
					>
						{{ __('Notifications') }}
					</button>
					<button
						type="button"
						class="kpg-notification-tab"
						:class="{ active: activeTab === 'events' }"
						@click="onSelectEventsTab"
					>
						{{ __('Events') }}
					</button>
					<button
						type="button"
						class="kpg-notification-tab"
						:class="{ active: activeTab === 'changelog' }"
						@click="activeTab = 'changelog'"
					>
						{{ __("What's New") }}
					</button>
				</div>

				<!-- Header Actions -->
				<div class="kpg-notification-header-actions">
					<button
						type="button"
						class="kpg-header-action-btn"
						:title="__('Mark all as read')"
						:aria-label="__('Mark all as read')"
						@click="onMarkAllAsRead"
					>
						<CheckCheck class="size-4" aria-hidden="true" />
					</button>
					<button
						type="button"
						class="kpg-header-action-btn"
						:title="__('Notification Settings')"
						:aria-label="__('Notification Settings')"
						@click="goToSettings"
					>
						<Settings class="size-4" aria-hidden="true" />
					</button>
				</div>
			</div>

			<!-- Body: Notifications Tab -->
			<div v-if="activeTab === 'notifications'" class="kpg-notification-body">
				<div v-if="notificationsList.length" class="kpg-notification-items">
					<div
						v-for="n in notificationsList"
						:key="n.name"
						class="kpg-notification-item group"
						:class="{ unread: !n.read }"
						@click="onSelect(n)"
					>
						<!-- Unread indicator dot -->
						<div
							class="kpg-unread-indicator"
							:class="{ active: !n.read }"
							aria-hidden="true"
						/>

						<!-- Square Avatar Frame -->
						<div class="kpg-avatar-frame">
							<img
								v-if="n.from_user_details?.user_image"
								:src="safeUrl(n.from_user_details.user_image)"
								:alt="n.from_user_details.full_name || n.from_user"
								class="kpg-avatar-circle object-cover"
							/>
							<div
								v-else
								class="kpg-avatar-circle kpg-avatar-initial"
								:style="getAvatarBadgeStyle(n)"
							>
								{{ getAvatarLetter(n) }}
							</div>
						</div>

						<!-- Message details -->
						<div class="kpg-message-col">
							<div
								class="kpg-message-text"
								v-safe-html:basic="decodeEntities(n.subject)"
							/>
							<div class="kpg-timestamp-text">
								{{ formatRelativeTime(n.creation) }}
							</div>
						</div>

						<!-- Hover mark-as-read circle for unread items -->
						<button
							v-if="!n.read"
							type="button"
							class="kpg-item-mark-read"
							:title="__('Mark as read')"
							:aria-label="__('Mark as read')"
							@click.stop="onMarkItemAsRead(n)"
						/>
					</div>

					<!-- Footer -->
					<a
						href="/app/List/Notification Log"
						class="kpg-notification-footer"
						@click="closeNotifications"
					>
						{{ __('See all Activity') }}
					</a>
				</div>

				<!-- Empty State -->
				<div v-else class="kpg-notification-empty">
					<Bell class="size-8 text-gray-300 mb-2" aria-hidden="true" />
					<div class="text-sm font-semibold text-gray-800">
						{{ __('No New notifications') }}
					</div>
					<div class="text-xs text-gray-500 mt-1">
						{{ __("Looks like you haven’t received any notifications.") }}
					</div>
				</div>
			</div>

			<!-- Body: Events Tab -->
			<div v-else-if="activeTab === 'events'" class="kpg-notification-body">
				<div v-if="eventsLoading" class="py-10 text-center text-xs text-gray-400">
					{{ __('Loading events…') }}
				</div>
				<div v-else-if="eventsList.length" class="kpg-events-list">
					<a
						v-for="ev in eventsList"
						:key="ev.name"
						:href="safeUrl('/app/event/' + ev.name)"
						class="kpg-event-item"
						@click="closeNotifications"
					>
						<div
							class="kpg-event-stripe"
							:style="{ backgroundColor: ev.color || '#3b82f6' }"
						/>
						<div class="kpg-event-details">
							<div class="kpg-event-subject">{{ ev.subject }}</div>
							<div class="kpg-event-time">
								{{ formatEventTime(ev) }}
							</div>
						</div>
					</a>
				</div>
				<div v-else class="kpg-notification-empty">
					<Calendar class="size-8 text-gray-300 mb-2" aria-hidden="true" />
					<div class="text-sm font-semibold text-gray-800">
						{{ __('No Upcoming Events') }}
					</div>
					<div class="text-xs text-gray-500 mt-1">
						{{ __('There are no upcoming events for you.') }}
					</div>
				</div>
			</div>

			<!-- Body: What's New Tab -->
			<div v-else-if="activeTab === 'changelog'" class="kpg-notification-body">
				<div v-if="changelogList.length" class="kpg-changelog-list">
					<div
						v-for="(item, idx) in changelogList"
						:key="idx"
						class="kpg-changelog-item"
					>
						<div class="kpg-changelog-title">{{ item.title }}</div>
						<div class="kpg-changelog-meta">
							{{ item.app_title ? item.app_title + ' | ' : '' }}{{ formatRelativeTime(item.posting_timestamp) }}
						</div>
					</div>
				</div>
				<div v-else class="kpg-notification-empty">
					<Sparkles class="size-8 text-gray-300 mb-2" aria-hidden="true" />
					<div class="text-sm font-semibold text-gray-800">
						{{ __('No New updates') }}
					</div>
					<div class="text-xs text-gray-500 mt-1">
						{{ __('There are no new updates.') }}
					</div>
				</div>
			</div>
		</div>
	</Teleport>
</template>

<script setup>
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { onClickOutside } from '@vueuse/core'
import { CheckCheck, Settings, Bell, Calendar, Sparkles } from 'lucide-vue-next'
import { call } from 'frappe-ui'
import { decodeEntities } from '@/utils'
import { safeUrl } from '@/utils/safeUrl'
import {
	panelVisible,
	closeNotifications,
	notifications,
	markAsRead,
	markAllAsRead,
} from '@/stores/notifications'

const dayjs = inject('$dayjs')
const router = useRouter()

const panelRef = ref(null)
const activeTab = ref('notifications')
const dropdownStyle = ref({})

// Events
const eventsList = ref([])
const eventsLoading = ref(false)
const eventsLoaded = ref(false)

// Changelog
const changelogList = computed(() => {
	if (typeof window !== 'undefined' && window.frappe?.boot?.changelog_feed) {
		return window.frappe.boot.changelog_feed
	}
	return []
})

// Notifications list: ALL notifications in order (read + unread), like CRM/Desk
const notificationsList = computed(() => notifications.data || [])

function formatRelativeTime(dateStr) {
	if (!dateStr) return ''
	try {
		if (dayjs) return dayjs(dateStr).fromNow()
		return new Date(dateStr).toLocaleDateString()
	} catch {
		return String(dateStr)
	}
}

function formatEventTime(ev) {
	if (ev.all_day) return 'All Day'
	const start = ev.starts_on ? ev.starts_on.slice(11, 16) : ''
	const end = ev.ends_on ? ev.ends_on.slice(11, 16) : ''
	return start && end ? `${start} - ${end}` : start || 'All Day'
}

function getAvatarLetter(n) {
	const text = n.from_user_details?.full_name || n.from_user || 'U'
	return text.trim().charAt(0).toUpperCase() || 'U'
}

const AVATAR_PALETTES = [
	{ bg: '#fed7aa', text: '#c2410c' }, // orange
	{ bg: '#fce7f3', text: '#be185d' }, // pink
	{ bg: '#dbeafe', text: '#1d4ed8' }, // blue
	{ bg: '#def7ec', text: '#03543f' }, // green
	{ bg: '#def7ec', text: '#03543f' }, // dark green
	{ bg: '#fee2e2', text: '#b91c1c' }, // red
	{ bg: '#fef3c7', text: '#b45309' }, // yellow
	{ bg: '#f3e8ff', text: '#6b21a8' }, // purple
]

function getAvatarBadgeStyle(n) {
	const user = (n.from_user_details?.full_name || n.from_user || '').trim()
	// Match Screenshot 1: 'Administrator' or letter 'A' is green
	if (user.toLowerCase().startsWith('admin') || user.charAt(0).toUpperCase() === 'A') {
		return { backgroundColor: '#def7ec', color: '#03543f' }
	}
	let hash = 0
	for (let i = 0; i < user.length; i++) {
		hash = (hash << 5) - hash + user.charCodeAt(i)
		hash |= 0
	}
	const idx = Math.abs(hash) % AVATAR_PALETTES.length
	return {
		backgroundColor: AVATAR_PALETTES[idx].bg,
		color: AVATAR_PALETTES[idx].text,
	}
}

async function onSelectEventsTab() {
	activeTab.value = 'events'
	if (eventsLoaded.value) return
	eventsLoading.value = true
	try {
		const today = dayjs ? dayjs().format('YYYY-MM-DD') : new Date().toISOString().split('T')[0]
		const res = await call('frappe.desk.doctype.event.event.get_events', {
			start: today,
			end: today,
		})
		eventsList.value = res || []
	} catch {
		eventsList.value = []
	} finally {
		eventsLoading.value = false
		eventsLoaded.value = true
	}
}

function onMarkAllAsRead() {
	markAllAsRead.submit()
}

function onMarkItemAsRead(n) {
	if (!n.read) {
		markAsRead.submit({ name: n.name })
	}
}

function goToSettings() {
	closeNotifications()
	window.location.href = '/app/notification-settings'
}

const onSelect = (n) => {
	if (!n.read) markAsRead.submit({ name: n.name })
	navigateToPage(n)
	closeNotifications()
}

const navigateToPage = (log) => {
	if (!log.link) {
		window.location.href = `/app/notification-log/${encodeURIComponent(log.name)}`
		return
	}
	let link = log.link.split('/')
	if (link[2] == 'courses') {
		router.push({ name: 'CourseDetail', params: { courseName: link[3] } })
	} else if (link.includes('batches')) {
		const batchTarget = link.pop()
		const [batchName, hashValue] = batchTarget.split('#')
		router.push({
			name: 'BatchDetail',
			params: { batchName },
			hash: hashValue ? `#${hashValue}` : '',
		})
	} else if (link.includes('assignment-submission')) {
		router.push({
			name: 'AssignmentSubmission',
			params: { submissionName: link[4], assignmentID: link[3] },
		})
	} else {
		window.location.href = log.link
	}
}

function updatePosition() {
	if (typeof window === 'undefined') return

	if (window.innerWidth < 420) {
		dropdownStyle.value = {
			position: 'fixed',
			top: '54px',
			left: '12px',
			right: '12px',
			width: 'calc(100vw - 24px)',
			maxHeight: 'calc(100vh - 70px)',
			zIndex: 1000,
		}
		return
	}

	const trigger =
		document.querySelector('[data-notifications-trigger]') ||
		document.querySelector('.kpg-topbar-btn')

	if (trigger) {
		const rect = trigger.getBoundingClientRect()
		const right = Math.max(12, Math.round(window.innerWidth - rect.right))
		const top = Math.round(rect.bottom + 6)
		dropdownStyle.value = {
			position: 'fixed',
			top: `${top}px`,
			right: `${right}px`,
			width: '360px',
			maxHeight: 'min(480px, calc(100vh - 70px))',
			zIndex: 1000,
		}
	} else {
		dropdownStyle.value = {
			position: 'fixed',
			top: '54px',
			right: '16px',
			width: '360px',
			maxHeight: 'min(480px, calc(100vh - 70px))',
			zIndex: 1000,
		}
	}
}

onClickOutside(panelRef, () => closeNotifications(), {
	ignore: ['[data-notifications-trigger]'],
})

watch(panelVisible, (open) => {
	if (open) {
		notifications.reload()
		nextTick(updatePosition)
	}
})

function onKeyDown(e) {
	if (e.key === 'Escape' && panelVisible.value) {
		closeNotifications()
	}
}

onMounted(() => {
	window.addEventListener('resize', updatePosition)
	window.addEventListener('scroll', updatePosition, true)
	window.addEventListener('keydown', onKeyDown)
})

onBeforeUnmount(() => {
	window.removeEventListener('resize', updatePosition)
	window.removeEventListener('scroll', updatePosition, true)
	window.removeEventListener('keydown', onKeyDown)
})
</script>

<style scoped>
.kpg-notification-dropdown {
	background: var(--kpg-surface);
	border: 1px solid var(--kpg-border-2);
	border-radius: 8px;
	box-shadow: var(--kpg-sh-panel);
	display: flex;
	flex-direction: column;
	overflow: hidden;
	font-family: inherit;
}

.kpg-notification-header {
	height: 42px;
	padding: 0 12px;
	border-bottom: 1px solid var(--kpg-border-2);
	display: flex;
	align-items: center;
	justify-content: space-between;
	background: var(--kpg-surface);
	flex-shrink: 0;
}

.kpg-notification-tabs {
	display: flex;
	align-items: center;
	gap: 16px;
	height: 100%;
}

.kpg-notification-tab {
	height: 100%;
	display: inline-flex;
	align-items: center;
	padding: 0 2px;
	font-size: 13px;
	font-weight: 500;
	color: var(--kpg-muted);
	border-bottom: 2px solid transparent;
	background: transparent;
	border-top: 0;
	border-left: 0;
	border-right: 0;
	cursor: pointer;
	transition: all 0.15s ease;
}

.kpg-notification-tab:hover {
	color: var(--kpg-ink);
}

.kpg-notification-tab.active {
	color: var(--kpg-ink);
	font-weight: 600;
	border-bottom: 2px solid var(--kpg-ink);
}

.kpg-notification-header-actions {
	display: flex;
	align-items: center;
	gap: 6px;
}

.kpg-header-action-btn {
	width: 28px;
	height: 28px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	border-radius: 4px;
	color: var(--kpg-muted);
	background: transparent;
	border: 0;
	cursor: pointer;
	transition: all 0.15s ease;
	padding: 0;
}

.kpg-header-action-btn:hover {
	color: var(--kpg-ink);
	background-color: var(--kpg-chip);
}

.kpg-notification-body {
	flex: 1;
	overflow-y: auto;
	overflow-x: hidden;
	max-height: 420px;
	background: var(--kpg-surface);
}

.kpg-notification-body::-webkit-scrollbar {
	width: 6px;
}

.kpg-notification-body::-webkit-scrollbar-track {
	background: transparent;
}

.kpg-notification-body::-webkit-scrollbar-thumb {
	background: var(--kpg-border-strong);
	border-radius: 3px;
}

.kpg-notification-items {
	display: flex;
	flex-direction: column;
	padding: 4px 0 0 0;
}

.kpg-notification-item {
	display: flex;
	align-items: flex-start;
	gap: 8px;
	padding: 10px 10px 10px 6px;
	margin: 2px 6px;
	border-radius: 6px;
	cursor: pointer;
	transition: background-color 0.12s ease;
	user-select: none;
}

.kpg-notification-item:hover {
	background-color: var(--kpg-hover);
}

.kpg-unread-indicator {
	width: 6px;
	height: 6px;
	border-radius: 50%;
	margin-top: 15px;
	flex-shrink: 0;
	background-color: transparent;
}

.kpg-unread-indicator.active {
	background-color: var(--kpg-ink);
}

.kpg-avatar-frame {
	width: 36px;
	height: 36px;
	min-width: 36px;
	min-height: 36px;
	border: 1px solid var(--kpg-border-2);
	border-radius: 4px;
	background: var(--kpg-surface);
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.kpg-avatar-circle {
	width: 28px;
	height: 28px;
	border-radius: 50%;
}

.kpg-avatar-initial {
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 12px;
	font-weight: 600;
	text-transform: uppercase;
}

.kpg-message-col {
	flex: 1;
	min-width: 0;
	padding-left: 2px;
}

.kpg-message-text {
	font-size: 13px;
	line-height: 1.35;
	color: var(--kpg-ink-2);
	word-break: break-word;
}

:deep(.kpg-message-text b),
:deep(.kpg-message-text strong) {
	font-weight: 600;
	color: var(--kpg-ink);
}

.kpg-timestamp-text {
	font-size: 12px;
	color: var(--kpg-placeholder);
	margin-top: 3px;
}

.kpg-item-mark-read {
	width: 8px;
	height: 8px;
	border-radius: 50%;
	border: 1.5px solid transparent;
	background: transparent;
	margin-top: 14px;
	flex-shrink: 0;
	cursor: pointer;
	padding: 0;
	transition: all 0.15s ease;
}

.kpg-notification-item:hover .kpg-item-mark-read {
	border-color: var(--kpg-placeholder);
}

.kpg-notification-item:hover .kpg-item-mark-read:hover {
	border-color: var(--kpg-ink);
	background-color: var(--kpg-ink);
}

.kpg-notification-footer {
	display: block;
	text-align: center;
	padding: 10px 0;
	font-size: 12px;
	font-weight: 500;
	color: var(--kpg-muted);
	border-top: 1px solid var(--kpg-border-2);
	background: var(--kpg-surface);
	text-decoration: none;
	transition: background-color 0.12s ease, color 0.12s ease;
}

.kpg-notification-footer:hover {
	background-color: var(--kpg-hover);
	color: var(--kpg-ink);
}

.kpg-notification-empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 40px 16px;
	text-align: center;
}

/* Events */
.kpg-events-list {
	display: flex;
	flex-direction: column;
	padding: 6px;
}

.kpg-event-item {
	display: flex;
	align-items: stretch;
	gap: 10px;
	padding: 8px 10px;
	margin: 2px 0;
	border-radius: 6px;
	text-decoration: none;
	transition: background-color 0.12s ease;
}

.kpg-event-item:hover {
	background-color: var(--kpg-hover);
}

.kpg-event-stripe {
	width: 3px;
	border-radius: 2px;
	flex-shrink: 0;
}

.kpg-event-details {
	flex: 1;
	min-width: 0;
}

.kpg-event-subject {
	font-size: 13px;
	font-weight: 500;
	color: var(--kpg-ink);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.kpg-event-time {
	font-size: 12px;
	color: var(--kpg-placeholder);
	margin-top: 2px;
}

/* Changelog */
.kpg-changelog-list {
	display: flex;
	flex-direction: column;
	padding: 6px;
}

.kpg-changelog-item {
	padding: 8px 10px;
	margin: 2px 0;
	border-radius: 6px;
	transition: background-color 0.12s ease;
}

.kpg-changelog-item:hover {
	background-color: var(--kpg-hover);
}

.kpg-changelog-title {
	font-size: 13px;
	font-weight: 500;
	color: var(--kpg-ink);
}

.kpg-changelog-meta {
	font-size: 12px;
	color: var(--kpg-placeholder);
	margin-top: 2px;
}
</style>
