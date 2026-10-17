<template>
	<div class="flex h-dvh w-screen">
		<a
			href="#main-content"
			@click.prevent="skipToContent('main-content')"
			class="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:rounded focus:bg-surface-base focus:px-4 focus:py-2 focus:text-ink-gray-9 focus:shadow-md focus:outline-none focus:ring-2 focus:ring-outline-gray-3"
		>
			{{ __('Skip to main content') }}
		</a>
		<!-- KPG styled rail: fixed 210px, full height, KPG gradient. -->
		<div
			class="kpg-lms-sidebar h-full shrink-0"
			:class="{ 'kpg-lms-collapsed': isCollapsed }"
		>
			<AppSidebar />
		</div>
		<div class="flex flex-1 flex-col min-w-0">
			<header class="kpg-lms-topbar">
				<!-- 1. Handle toggle button (matches .kpg-rail-handle 1:1) -->
				<button
					type="button"
					class="kpg-rail-handle-btn"
					:title="isCollapsed ? __('Expand menu') : __('Collapse menu')"
					:aria-label="isCollapsed ? __('Expand menu') : __('Collapse menu')"
					:aria-expanded="!isCollapsed"
					@click="sidebarStore.isSidebarCollapsed = !sidebarStore.isSidebarCollapsed"
				>
					<Menu class="h-3.5 w-3.5" aria-hidden="true" />
				</button>

				<!-- 2. CRM autocomplete search bar (matches Desk 1:1) -->
				<LmsSearchBar />

				<!-- 3. Right-hand controls (matches Desk 1:1) -->
				<div class="kpg-topbar-right">
					<!-- Branch pill -->
					<span class="kpg-branch-label" :title="branchLabel">
						<span class="kpg-branch-dot"></span>
						<span class="kpg-branch-text">{{ branchLabel }}</span>
					</span>

					<!-- Notifications button with unread indicator -->
					<button
						type="button"
						class="kpg-topbar-btn"
						data-notifications-trigger
						:aria-label="__('Notifications')"
						:title="__('Notifications')"
						@click="toggleNotifications"
					>
						<Bell class="h-4 w-4" aria-hidden="true" />
						<span v-if="unreadCount > 0" class="kpg-unread-dot" aria-hidden="true" />
					</button>

					<!-- Divider -->
					<div class="kpg-topbar-divider"></div>

					<!-- Help dropdown -->
					<Dropdown :options="helpOptions" align="end" :offset="6">
						<button
							type="button"
							class="kpg-topbar-help"
							:aria-label="__('Help')"
							:title="__('Help')"
						>
							<span>{{ __('Help') }}</span>
							<ChevronDown class="h-3 w-3" aria-hidden="true" />
						</button>
					</Dropdown>

					<!-- User Avatar dropdown -->
					<Dropdown :options="userDropdownOptions" align="end" :offset="6">
						<button
							type="button"
							class="kpg-topbar-avatar"
							:aria-label="__('User menu')"
							:title="userFullName"
						>
							<img
								v-if="userImage"
								:src="safeUrl(userImage)"
								:alt="userFullName"
								class="kpg-avatar-circle object-cover"
							/>
							<span
								v-else
								class="kpg-avatar-circle kpg-avatar-initial"
								:style="avatarBadgeStyle"
							>
								{{ avatarLetter }}
							</span>
						</button>
					</Dropdown>
				</div>
			</header>
			<main
				id="main-content"
				tabindex="-1"
				class="kpg-lms-main flex-1 flex flex-col overflow-auto focus:outline-none"
			>
				<slot />
			</main>
		</div>
	</div>
</template>
<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Dropdown } from 'frappe-ui'
import {
	Menu,
	Bell,
	ChevronDown,
} from 'lucide-vue-next'
import { safeUrl } from '@/utils/safeUrl'
import { skipToContent } from '@/utils/a11y'
import AppSidebar from '@/components/Sidebar/AppSidebar.vue'
import LmsSearchBar from '@/components/Controls/LmsSearchBar.vue'
import { useSidebar } from '@/stores/sidebar'
import { useSettings } from '@/stores/settings'
import { usersStore } from '@/stores/user'
import { sessionStore } from '@/stores/session'
import {
	getHelpOptions,
	getUserDropdownOptions,
	getUserAvatarLetter,
	getUserAvatarStyle,
} from '@/utils/topbarDropdowns'
import {
	unreadCount,
	toggleNotifications,
	loadUnreadCount,
} from '@/stores/notifications'

const router = useRouter()
const sidebarStore = useSidebar()
const settingsStore = useSettings()
const userStore = usersStore()
const sessStore = sessionStore()

const isCollapsed = computed(() => sidebarStore.isSidebarCollapsed)

onMounted(() => {
	loadUnreadCount()
})

const branchLabel = computed(() => {
	try {
		const label = sessionStorage.getItem('kpg_branch_label')
		return label === 'All' ? 'All Branches' : (label || 'All Branches')
	} catch {
		return 'All Branches'
	}
})

const userFullName = computed(() => {
	return userStore.userResource?.data?.full_name || userStore.userResource?.data?.name || 'User'
})

const userImage = computed(() => {
	return userStore.userResource?.data?.user_image || null
})

const avatarLetter = computed(() => {
	return getUserAvatarLetter(userStore.userResource?.data)
})

const avatarBadgeStyle = computed(() => {
	return getUserAvatarStyle(userStore.userResource?.data)
})

const userDropdownOptions = computed(() => {
	return getUserDropdownOptions(userStore.userResource?.data, sessStore)
})

const helpOptions = computed(() => {
	return getHelpOptions(settingsStore)
})
</script>